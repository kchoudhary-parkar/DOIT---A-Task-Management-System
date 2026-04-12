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
import tempfile
import logging
import httpx
from pathlib import Path
from typing import Optional, List

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
WHISPER_ENDPOINT  = os.getenv("WHISPER_ENDPOINT")      # full URL with ?api-version=…
WHISPER_API_KEY   = os.getenv("WHISPER_API_KEY") or os.getenv("AZURE_OPENAI_KEY")

TTS_ENDPOINT      = os.getenv("TTS_ENDPOINT")          # full URL with ?api-version=…
TTS_API_KEY       = os.getenv("TTS_API_KEY") or os.getenv("AZURE_OPENAI_KEY")

# Azure AI Foundry Agent (reuse from azure_agent_utils)
try:
    from utils.azure_agent_utils import send_message_to_agent, get_or_create_thread
    FOUNDRY_AVAILABLE = True
    logger.info("✅ Azure AI Foundry Agent utils imported")
except Exception as exc:
    FOUNDRY_AVAILABLE = False
    logger.warning(f"⚠️  Azure AI Foundry Agent utils not available: {exc}")

# ── Voice personas → TTS voice mapping ───────────────────────────────────────
PERSONA_VOICES = {
    "friendly":     "alloy",
    "professional": "onyx",
    "direct":       "echo",
    "assistant":    "nova",
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
        ".mp4":  "audio/mp4",
        ".m4a":  "audio/mp4",
        ".mp3":  "audio/mpeg",
        ".wav":  "audio/wav",
        ".ogg":  "audio/ogg",
    }
    ct_ext_map = {
        "audio/webm": (".webm", "audio/webm"),
        "audio/mp4":  (".mp4",  "audio/mp4"),
        "audio/mpeg": (".mp3",  "audio/mpeg"),
        "audio/wav":  (".wav",  "audio/wav"),
        "audio/ogg":  (".ogg",  "audio/ogg"),
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
    logger.warning(f"Unknown audio format: filename={filename!r}, content_type={content_type!r} — defaulting to webm")
    return "audio.webm", "audio/webm"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm", content_type: str = "") -> dict:
    """
    Send audio bytes to Azure Whisper and return transcription result.
    Uses the WHISPER_ENDPOINT from .env (already includes deployment + api-version).
    """
    if not WHISPER_ENDPOINT or not WHISPER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Whisper endpoint/key not configured (WHISPER_ENDPOINT, WHISPER_API_KEY)"
        )

    safe_filename, mime = _normalise_audio_filename(filename, content_type)
    logger.info(f"🎤 Transcribing {len(audio_bytes)} bytes | file={safe_filename} | mime={mime}")

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
            detail=f"Whisper transcription failed: HTTP {resp.status_code}"
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

async def query_foundry_agent(user_id: str, transcript: str, conversation_history: list) -> str:
    """
    Send transcript to Azure AI Foundry Agent and return the text reply.
    Falls back to a simple echo if the agent is unavailable.
    """
    if not FOUNDRY_AVAILABLE:
        return (
            "I'm sorry, the AI agent is currently unavailable. "
            "Please check that the Azure AI Foundry Agent is configured correctly."
        )

    # Build context string from recent conversation history
    context = None
    if conversation_history:
        recent = conversation_history[-6:]  # last 3 turns
        context = {
            "conversation_history": recent,
            "interface": "voice",
            "instruction": (
                "You are a voice assistant. Keep replies concise (2-4 sentences). "
                "No markdown, no bullet points — plain spoken language only."
            ),
        }

    logger.info(f"🤖 Querying Foundry Agent for user {user_id}: {transcript[:60]}…")

    result = send_message_to_agent(
        user_id=user_id,
        message=transcript,
        context=context,
    )

    if not result.get("success"):
        err = result.get("error", "Unknown agent error")
        logger.error(f"Agent error: {err}")
        raise HTTPException(status_code=502, detail=f"Agent error: {err}")

    response_text = result.get("response", "").strip()
    logger.info(f"✅ Agent reply: {response_text[:80]}…")
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
            detail="TTS endpoint/key not configured (TTS_ENDPOINT, TTS_API_KEY)"
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
            status_code=502,
            detail=f"TTS synthesis failed: HTTP {resp.status_code}"
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
      2. Azure AI Foundry Agent — generate reply
      3. Azure TTS — synthesize reply to audio
    Returns: audio/mpeg stream with X-Transcript and X-Response-Text headers.
    """
    # ── 1. Read uploaded audio ────────────────────────────────────────────────
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    filename     = audio.filename or "audio.webm"
    content_type = audio.content_type or ""
    logger.info(f"🎙️ Voice chat — user={user_id}, file={filename!r}, content_type={content_type!r}, size={len(audio_bytes)} bytes")

    # ── 2. Parse conversation history ─────────────────────────────────────────
    try:
        history: list = json.loads(conversation_history)
    except Exception:
        history = []

    # ── 3. Whisper STT ────────────────────────────────────────────────────────
    stt_result   = await transcribe_audio(audio_bytes, filename, content_type)
    transcript   = stt_result["text"]

    if not transcript:
        raise HTTPException(status_code=422, detail="No speech detected in audio")

    # ── 4. Azure AI Foundry Agent ─────────────────────────────────────────────
    response_text = await query_foundry_agent(user_id, transcript, history)

    # ── 5. Azure TTS ──────────────────────────────────────────────────────────
    voice      = PERSONA_VOICES.get(persona, "alloy")
    audio_out  = await synthesize_speech(response_text, voice)

    # ── 6. Stream audio back with metadata headers ────────────────────────────
    safe_transcript    = transcript.replace("\n", " ")[:500]
    safe_response_text = response_text.replace("\n", " ")[:1000]

    return StreamingResponse(
        iter([audio_out]),
        media_type="audio/mpeg",
        headers={
            "X-Transcript":      safe_transcript,
            "X-Response-Text":   safe_response_text,
            "Cache-Control":     "no-cache",
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

    result = await transcribe_audio(audio_bytes, audio.filename or "audio.webm", audio.content_type or "")
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

    voice     = PERSONA_VOICES.get(body.persona, "alloy")
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
        "pipeline": "Whisper → Azure AI Foundry Agent → TTS",
        "whisper": {
            "configured": bool(WHISPER_ENDPOINT and WHISPER_API_KEY),
            "endpoint":   (WHISPER_ENDPOINT or "")[:60] + "…" if WHISPER_ENDPOINT else None,
        },
        "foundry_agent": {
            "available": FOUNDRY_AVAILABLE,
        },
        "tts": {
            "configured": bool(TTS_ENDPOINT and TTS_API_KEY),
            "endpoint":   (TTS_ENDPOINT or "")[:60] + "…" if TTS_ENDPOINT else None,
        },
        "voice_presets": list(PERSONA_VOICES.keys()),
    }

    all_ok = (
        status["whisper"]["configured"]
        and status["foundry_agent"]["available"]
        and status["tts"]["configured"]
    )
    status["healthy"] = all_ok

    return JSONResponse(content=status, status_code=200 if all_ok else 503)