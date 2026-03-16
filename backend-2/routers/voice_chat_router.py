"""
voice_chat_router.py
Voice Chat Interface with Azure Whisper STT + GPT-4o-mini + Azure TTS

Flow:
1. Frontend sends audio file (webm/mp3/wav)
2. Backend transcribes with Azure Whisper
3. GPT-4o-mini generates response (streaming)
4. Azure TTS converts response to audio
5. Stream audio back to frontend
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from controllers import chat_controller
from dependencies import get_current_user
from utils.azure_speech_utils import transcribe_audio, text_to_speech, get_voice_config
from utils.azure_ai_utils import chat_completion_streaming
from utils.ai_data_analyzer import analyze_user_data_for_ai, build_ai_system_prompt
import json
import io
import asyncio

router = APIRouter()


@router.post("/voice/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Transcribe audio file using Azure Whisper
    
    Accepts: webm, mp3, wav, m4a, ogg
    Returns: { text, language, duration }
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # Read audio file
        audio_bytes = await audio.read()
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = audio.filename or "audio.webm"
        
        print(f"🎤 [Whisper] Transcribing audio: {audio.filename} ({len(audio_bytes)} bytes)")
        
        # Transcribe with Azure Whisper
        result = transcribe_audio(audio_file)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Transcription failed")
            )
        
        return {
            "success": True,
            "text": result.get("text", ""),
            "language": result.get("language"),
            "duration": result.get("duration"),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Whisper] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/voice/chat")
async def voice_chat(
    audio: UploadFile = File(...),
    persona: str = "friendly",
    conversation_history: str = "[]",  # JSON string
    user_id: str = Depends(get_current_user)
):
    """
    Complete voice chat flow:
    1. Transcribe audio with Whisper
    2. Generate response with GPT-4o-mini (streaming)
    3. Convert response to speech with TTS
    4. Stream audio back
    
    Returns: Audio stream (MP3)
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # ── 1. Transcribe audio ────────────────────────────────────────
        audio_bytes = await audio.read()
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = audio.filename or "audio.webm"
        
        print(f"🎤 [Voice Chat] Step 1: Transcribing audio ({len(audio_bytes)} bytes)")
        
        transcription = transcribe_audio(audio_file)
        if not transcription.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"Transcription failed: {transcription.get('error')}"
            )
        
        user_message = transcription.get("text", "").strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="No speech detected")
        
        print(f"✅ Transcribed: '{user_message[:100]}...'")
        
        # ── 2. Generate AI response ────────────────────────────────────
        print(f"🤖 [Voice Chat] Step 2: Generating AI response")
        
        # Parse conversation history
        try:
            history = json.loads(conversation_history)
        except:
            history = []
        
        # Detect intent and gather context (from existing chat_controller logic)
        intent = chat_controller.detect_intent(user_message)
        is_pm_query = intent in [
            "risk_analysis", "assignment_suggestion", "team_inquiry",
            "sprint_status", "workload_check", "blocker_analysis",
            "velocity_check", "recommendation", "project_inquiry"
        ]
        
        # Get context
        if is_pm_query:
            sprint_name = None
            project_name = None
            if intent == "sprint_status":
                sprint_name = chat_controller.extract_sprint_name(user_message)
            if intent == "project_inquiry":
                project_name = chat_controller.extract_project_name(user_message)
            
            context = chat_controller.gather_pm_context(
                user_id, None, intent,
                sprint_name=sprint_name,
                project_name=project_name
            )
            system_prompt = chat_controller.build_pm_system_prompt(persona, context)
        else:
            user_data = analyze_user_data_for_ai(user_id)
            system_prompt = build_ai_system_prompt(user_data)
            context = user_data
        
        # Build messages
        from utils.azure_ai_utils import get_context_with_system_prompt, truncate_context
        
        prior_messages = chat_controller.build_messages(history, user_message)
        messages = get_context_with_system_prompt(
            prior_messages[:-1],
            system_prompt=system_prompt
        )
        messages.append({"role": "user", "content": user_message})
        messages = truncate_context(messages, max_tokens=8000)
        
        # Stream GPT response and collect full text
        full_response = ""
        for chunk in chat_completion_streaming(messages, max_tokens=1500):
            full_response += chunk
        
        print(f"✅ AI Response: '{full_response[:100]}...'")
        
        # ── 3. Convert to speech ───────────────────────────────────────
        print(f"🔊 [Voice Chat] Step 3: Converting to speech")
        
        voice_config = get_voice_config(persona)
        tts_result = text_to_speech(
            full_response,
            voice=voice_config["voice"],
            speed=voice_config["speed"],
            output_format="mp3"
        )
        
        if not tts_result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"TTS failed: {tts_result.get('error')}"
            )
        
        audio_bytes = tts_result.get("audio")
        print(f"✅ Audio generated: {len(audio_bytes)} bytes")
        
        # ── 4. Return audio stream ─────────────────────────────────────
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "X-Transcript": user_message,  # Include transcript in header
                "X-Response-Text": full_response[:500],  # Truncated response text
                "Content-Disposition": "inline; filename=response.mp3"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Voice Chat] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")


@router.post("/voice/synthesize")
async def synthesize_speech(
    text: str,
    persona: str = "friendly",
    user_id: str = Depends(get_current_user)
):
    """
    Convert text to speech using Azure TTS
    
    Body: { "text": "...", "persona": "friendly" }
    Returns: Audio stream (MP3)
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        voice_config = get_voice_config(persona)
        result = text_to_speech(
            text,
            voice=voice_config["voice"],
            speed=voice_config["speed"],
            output_format="mp3"
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "TTS failed")
            )
        
        audio_bytes = result.get("audio")
        
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [TTS] Error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


@router.get("/voice/health")
async def voice_health(user_id: str = Depends(get_current_user)):
    """Check Azure Speech services health"""
    try:
        from utils.azure_speech_utils import WHISPER_ENDPOINT, WHISPER_API_KEY, TTS_ENDPOINT, TTS_API_KEY
        
        return {
            "success": True,
            "services": {
                "whisper": {
                    "configured": bool(WHISPER_ENDPOINT and WHISPER_API_KEY),
                    "endpoint": WHISPER_ENDPOINT[:50] + "..." if WHISPER_ENDPOINT else None
                },
                "tts": {
                    "configured": bool(TTS_ENDPOINT and TTS_API_KEY),
                    "endpoint": TTS_ENDPOINT[:50] + "..." if TTS_ENDPOINT else None
                }
            },
            "voice_presets": list(get_voice_config.__globals__['VOICE_PRESETS'].keys())
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }