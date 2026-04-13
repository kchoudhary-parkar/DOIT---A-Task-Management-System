"""
voice_chat_router.py
────────────────────
DOIT Voice Chat — Full Pipeline
  Audio (MediaRecorder) → Azure Whisper STT → Azure AI Foundry Agent → Azure TTS → Audio

Endpoints
---------
POST /api/voice-chat/voice/chat        — Full round-trip (audio in → audio out)
POST /api/voice-chat/voice/transcribe  — Whisper STT only
POST /api/voice-chat/voice/synthesize  — Azure TTS only
GET  /api/voice-chat/voice/health      — Service status
"""

import os
import json
import re
import logging
import asyncio
import time
import httpx
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger(__name__)

# ── Auth dependency (mirrors the rest of the app) ─────────────────────────────
try:
    from dependencies import get_current_user
except ImportError:

    async def get_current_user(request=None):
        return "dev-user"


# ── Azure config ──────────────────────────────────────────────────────────────
WHISPER_ENDPOINT = os.getenv("WHISPER_ENDPOINT")  # full URL with ?api-version=…
WHISPER_API_KEY = os.getenv("WHISPER_API_KEY") or os.getenv("AZURE_OPENAI_KEY")

TTS_ENDPOINT = os.getenv("TTS_ENDPOINT")  # full URL with ?api-version=…
TTS_API_KEY = os.getenv("TTS_API_KEY") or os.getenv("AZURE_OPENAI_KEY")

# DOIT AI Assistant (existing fast LLM path)
try:
    from controllers.ai_assistant_controller import generate_voice_assistant_reply

    ASSISTANT_AVAILABLE = True
    logger.info("✅ DOIT AI Assistant controller imported")
except Exception as exc:
    ASSISTANT_AVAILABLE = False
    logger.warning(f"⚠️  DOIT AI Assistant controller not available: {exc}")

VOICE_AGENT_TIMEOUT_SECONDS = float(os.getenv("VOICE_AGENT_TIMEOUT_SECONDS", "3.5"))
VOICE_MAX_HISTORY_ITEMS = int(os.getenv("VOICE_MAX_HISTORY_ITEMS", "4"))
VOICE_HISTORY_MSG_MAX_CHARS = int(os.getenv("VOICE_HISTORY_MSG_MAX_CHARS", "140"))
VOICE_RESPONSE_MAX_CHARS = int(os.getenv("VOICE_RESPONSE_MAX_CHARS", "200"))

# ── Voice personas → TTS voice mapping ───────────────────────────────────────
PERSONA_VOICES = {
    "friendly": "alloy",
    "professional": "onyx",
    "direct": "echo",
    "assistant": "nova",
}

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER: Azure Whisper STT
# ═══════════════════════════════════════════════════════════════════════════════


def _normalise_audio_filename(filename: str, content_type: str = "") -> tuple[str, str]:
    """
    Return (safe_filename, mime_type).

    MediaRecorder in Chrome sends filename='blob' with no extension.
    We derive the extension from content_type when the filename has none.
    """
    mime_map = {
        ".webm": "audio/webm",
        ".mp4": "audio/mp4",
        ".m4a": "audio/mp4",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
    }
    ct_ext_map = {
        "audio/webm": (".webm", "audio/webm"),
        "audio/mp4": (".mp4", "audio/mp4"),
        "audio/mpeg": (".mp3", "audio/mpeg"),
        "audio/wav": (".wav", "audio/wav"),
        "audio/ogg": (".ogg", "audio/ogg"),
        "video/webm": (".webm", "audio/webm"),  # some browsers report video/webm
    }

    ext = Path(filename).suffix.lower()

    if ext in mime_map:
        # filename already has a valid extension
        return filename, mime_map[ext]

    # No usable extension — derive from content_type
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in ct_ext_map:
        new_ext, mime = ct_ext_map[ct]
        return f"audio{new_ext}", mime

    # Fallback: assume webm (most common from Chrome MediaRecorder)
    logger.warning(
        f"Unknown audio format: filename={filename!r}, content_type={content_type!r} — defaulting to webm"
    )
    return "audio.webm", "audio/webm"


def _safe_header_value(value: str, limit: int) -> str:
    """
    Return an ASCII-only header-safe value.
    We percent-encode UTF-8 text because Starlette encodes headers as latin-1.
    """
    compact = (value or "").replace("\r", " ").replace("\n", " ").strip()[:limit]
    return quote(compact, safe=" -_.~")


def _compact_conversation_history(conversation_history: list) -> list:
    """Reduce payload size for lower-latency agent calls in voice mode."""
    compact: list = []
    if not conversation_history:
        return compact

    for msg in conversation_history[-VOICE_MAX_HISTORY_ITEMS:]:
        if not isinstance(msg, dict):
            continue

        role = str(msg.get("role", "")).strip()[:12]
        content = str(msg.get("content", "")).replace("\n", " ").strip()
        if not content:
            continue

        compact.append(
            {
                "role": role,
                "content": content[:VOICE_HISTORY_MSG_MAX_CHARS],
            }
        )

    return compact


def _normalize_voice_text(value: str) -> str:
    """Convert LLM-rich formatting into plain text suitable for voice and UI captions."""
    text = (value or "").replace("\r", " ").replace("\n", " ")
    text = re.sub(r"`{1,3}([^`]+)`{1,3}", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"\s*[-*]\s+", " ", text)
    text = re.sub(r"\s*\d+\.\s+", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


async def transcribe_audio(
    audio_bytes: bytes, filename: str = "audio.webm", content_type: str = ""
) -> dict:
    """
    Send audio bytes to Azure Whisper and return transcription result.
    Uses the WHISPER_ENDPOINT from .env (already includes deployment + api-version).
    """
    if not WHISPER_ENDPOINT or not WHISPER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Whisper endpoint/key not configured (WHISPER_ENDPOINT, WHISPER_API_KEY)",
        )

    safe_filename, mime = _normalise_audio_filename(filename, content_type)
    logger.info(
        f"🎤 Transcribing {len(audio_bytes)} bytes | file={safe_filename} | mime={mime}"
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            WHISPER_ENDPOINT,
            headers={"api-key": WHISPER_API_KEY},
            files={"file": (safe_filename, audio_bytes, mime)},
            data={"response_format": "json"},
        )

    if resp.status_code != 200:
        logger.error(f"Whisper error {resp.status_code}: {resp.text[:300]}")
        raise HTTPException(
            status_code=502,
            detail=f"Whisper transcription failed: HTTP {resp.status_code}",
        )

    result = resp.json()
    transcript = result.get("text", "").strip()
    logger.info(f"✅ Transcript: {transcript[:80]}…")
    return {
        "text": transcript,
        "language": result.get("language", "en"),
        "duration": result.get("duration"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER: Azure AI Foundry Agent
# ═══════════════════════════════════════════════════════════════════════════════


async def query_foundry_agent(
    user_id: str, transcript: str, conversation_history: list
) -> str:
    """
    Send transcript to the existing DOIT AI Assistant and return text reply.
    """
    if not ASSISTANT_AVAILABLE:
        return (
            "I'm sorry, the AI agent is currently unavailable. "
            "Please check that the DOIT AI Assistant service is configured correctly."
        )

    # Build context string from recent conversation history
    context = {
        "conversation_history": _compact_conversation_history(conversation_history),
        "interface": "voice",
        "instruction": (
            "You are a real-time voice assistant. Reply in plain text only, no markdown, "
            "no lists, no headings, no special symbols, and keep the reply under 40 words."
        ),
    }

    logger.info(f"🤖 Querying Foundry Agent for user {user_id}: {transcript[:60]}…")

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                generate_voice_assistant_reply,
                user_id=user_id,
                content=transcript,
                conversation_history=context.get("conversation_history", []),
                max_tokens=120,
            ),
            timeout=VOICE_AGENT_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning(
            "Voice agent timeout after %.2fs for user %s",
            VOICE_AGENT_TIMEOUT_SECONDS,
            user_id,
        )
        return "I need a bit more time to answer that. Please try a shorter question."

    if not result.get("success"):
        err = result.get("error", "Unknown agent error")
        logger.error(f"AI Assistant error: {err}")
        raise HTTPException(status_code=502, detail=f"Agent error: {err}")

    response_text = _normalize_voice_text(result.get("response", ""))
    response_text = response_text[:VOICE_RESPONSE_MAX_CHARS]
    logger.info(f"✅ AI Assistant reply: {response_text[:80]}…")
    return response_text


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER: Azure TTS
# ═══════════════════════════════════════════════════════════════════════════════


async def synthesize_speech(text: str, voice: str = "alloy") -> bytes:
    """
    Send text to Azure TTS and return raw MP3 audio bytes.
    Uses the TTS_ENDPOINT from .env (already includes deployment + api-version).
    """
    if not TTS_ENDPOINT or not TTS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TTS endpoint/key not configured (TTS_ENDPOINT, TTS_API_KEY)",
        )

    payload = {
        "model": "tts",
        "input": text,
        "voice": voice,
        "response_format": "mp3",
    }

    logger.info(f"🔊 Synthesizing {len(text)} chars with voice '{voice}'")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            TTS_ENDPOINT,
            headers={
                "api-key": TTS_API_KEY,
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code != 200:
        logger.error(f"TTS error {resp.status_code}: {resp.text[:300]}")
        raise HTTPException(
            status_code=502, detail=f"TTS synthesis failed: HTTP {resp.status_code}"
        )

    audio_bytes = resp.content
    logger.info(f"✅ TTS produced {len(audio_bytes)} bytes of audio")
    return audio_bytes


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Full voice round-trip
# POST /api/voice-chat/voice/chat
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/voice/chat")
async def voice_chat(
    audio: UploadFile = File(..., description="Audio recording (webm / mp4 / wav)"),
    persona: str = Form("friendly"),
    conversation_history: str = Form("[]"),
    user_id: str = Depends(get_current_user),
):
    """
    Full voice pipeline:
      1. Azure Whisper — transcribe user audio
    2. DOIT AI Assistant — generate reply
      3. Azure TTS — synthesize reply to audio
    Returns: audio/mpeg stream with X-Transcript and X-Response-Text headers.
    """
    req_t0 = time.perf_counter()

    # ── 1. Read uploaded audio ────────────────────────────────────────────────
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    filename = audio.filename or "audio.webm"
    content_type = audio.content_type or ""
    logger.info(
        f"🎙️ Voice chat — user={user_id}, file={filename!r}, content_type={content_type!r}, size={len(audio_bytes)} bytes"
    )

    # ── 2. Parse conversation history ─────────────────────────────────────────
    try:
        history: list = json.loads(conversation_history)
    except Exception:
        history = []

    # ── 3. Whisper STT ────────────────────────────────────────────────────────
    stt_t0 = time.perf_counter()
    stt_result = await transcribe_audio(audio_bytes, filename, content_type)
    stt_ms = int((time.perf_counter() - stt_t0) * 1000)
    transcript = stt_result["text"]

    if not transcript:
        raise HTTPException(status_code=422, detail="No speech detected in audio")

    # ── 4. DOIT AI Assistant ──────────────────────────────────────────────────
    agent_t0 = time.perf_counter()
    response_text = await query_foundry_agent(user_id, transcript, history)
    agent_ms = int((time.perf_counter() - agent_t0) * 1000)

    # ── 5. Azure TTS ──────────────────────────────────────────────────────────
    tts_t0 = time.perf_counter()
    voice = PERSONA_VOICES.get(persona, "alloy")
    audio_out = await synthesize_speech(response_text, voice)
    tts_ms = int((time.perf_counter() - tts_t0) * 1000)
    total_ms = int((time.perf_counter() - req_t0) * 1000)

    logger.info(
        "🎯 Voice latency | total=%dms stt=%dms agent=%dms tts=%dms",
        total_ms,
        stt_ms,
        agent_ms,
        tts_ms,
    )

    # ── 6. Stream audio back with metadata headers ────────────────────────────
    safe_transcript = _safe_header_value(transcript, 500)
    safe_response_text = _safe_header_value(response_text, 1000)

    return StreamingResponse(
        iter([audio_out]),
        media_type="audio/mpeg",
        headers={
            "X-Transcript": safe_transcript,
            "X-Response-Text": safe_response_text,
            "X-Voice-Latency-Total-Ms": str(total_ms),
            "X-Voice-Latency-Stt-Ms": str(stt_ms),
            "X-Voice-Latency-Agent-Ms": str(agent_ms),
            "X-Voice-Latency-Tts-Ms": str(tts_ms),
            "Cache-Control": "no-cache",
        },
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Whisper STT only
# POST /api/voice-chat/voice/transcribe
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/voice/transcribe")
async def transcribe_only(
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """Transcribe audio using Azure Whisper only (no agent, no TTS)."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    result = await transcribe_audio(
        audio_bytes, audio.filename or "audio.webm", audio.content_type or ""
    )
    return JSONResponse(content={"success": True, **result})


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Azure TTS only
# POST /api/voice-chat/voice/synthesize
# ═══════════════════════════════════════════════════════════════════════════════


class SynthesizeRequest(BaseModel):
    text: str
    persona: str = "friendly"


@router.post("/voice/synthesize")
async def synthesize_only(
    body: SynthesizeRequest,
    user_id: str = Depends(get_current_user),
):
    """Convert text to speech via Azure TTS only."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    voice = PERSONA_VOICES.get(body.persona, "alloy")
    audio_out = await synthesize_speech(body.text, voice)

    return StreamingResponse(
        iter([audio_out]),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: Health check
# GET /api/voice-chat/voice/health
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/voice/health")
async def voice_health():
    """Check availability of each voice-pipeline service."""
    status = {
        "pipeline": "Whisper → DOIT AI Assistant → TTS",
        "whisper": {
            "configured": bool(WHISPER_ENDPOINT and WHISPER_API_KEY),
            "endpoint": (WHISPER_ENDPOINT or "")[:60] + "…"
            if WHISPER_ENDPOINT
            else None,
        },
        "ai_assistant": {
            "available": ASSISTANT_AVAILABLE,
        },
        "tts": {
            "configured": bool(TTS_ENDPOINT and TTS_API_KEY),
            "endpoint": (TTS_ENDPOINT or "")[:60] + "…" if TTS_ENDPOINT else None,
        },
        "voice_presets": list(PERSONA_VOICES.keys()),
    }

    all_ok = (
        status["whisper"]["configured"]
        and status["ai_assistant"]["available"]
        and status["tts"]["configured"]
    )
    status["healthy"] = all_ok

    return JSONResponse(content=status, status_code=200 if all_ok else 503)
