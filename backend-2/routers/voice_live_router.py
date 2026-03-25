# """
# voice_live_router.py
# ────────────────────
# WebSocket proxy: Frontend ↔ Azure AI Foundry VoiceLive (Agent905)

# ADD TO main.py:
#     from routers.voice_live_router import router as voice_live_router
#     app.include_router(voice_live_router, prefix="/api/foundry-agent", tags=["VoiceLive"])

# ENV VARS REQUIRED:
#     AZURE_VOICELIVE_ENDPOINT   = https://ai-doit2026ai080910479902.cognitiveservices.azure.com/
#     AZURE_VOICELIVE_API_KEY    = <your resource key>
#     VOICELIVE_MODEL            = gpt-4o-realtime-preview   (default)
#     VOICELIVE_AGENT_ID         = Agent905                  (default)
#     VOICELIVE_VOICE            = en-US-SteffanDragonNeural (default)

# FLOW:
#     Browser WS  →  /api/foundry-agent/voice-live
#                        ↓  proxy
#     Azure VoiceLive WSS (wss://ai-doit2026...cognitiveservices.azure.com/...)
# """

# import os
# import json
# import asyncio
# import logging
# import websockets
# from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
# from fastapi.responses import JSONResponse
# from dotenv import load_dotenv

# load_dotenv()

# logger = logging.getLogger(__name__)

# router = APIRouter()

# # ── Config ─────────────────────────────────────────────────────────────────
# AZURE_ENDPOINT = os.getenv("AZURE_VOICELIVE_ENDPOINT", "").rstrip("/")
# AZURE_API_KEY = os.getenv("AZURE_VOICELIVE_API_KEY", "")
# VOICELIVE_MODEL = os.getenv("VOICELIVE_MODEL", "gpt-4o-realtime-preview")
# AGENT_ID = os.getenv("VOICELIVE_AGENT_ID", "Agent905")
# VOICE_NAME = os.getenv("VOICELIVE_VOICE", "en-US-SteffanDragonNeural")


# # Build the Azure VoiceLive WSS URL
# # Pattern: wss://<resource>.cognitiveservices.azure.com/openai/realtime?...
# def _build_azure_wss() -> str:
#     base = AZURE_ENDPOINT.replace("https://", "wss://").replace("http://", "ws://")
#     return (
#         f"{base}/openai/realtime"
#         f"?api-version=2025-04-01-preview"
#         f"&deployment={VOICELIVE_MODEL}"
#     )


# _AZURE_WSS_URL = _build_azure_wss()


# # ── Health check ────────────────────────────────────────────────────────────
# @router.get("/health")
# async def voice_live_health():
#     """Check VoiceLive configuration health."""
#     return JSONResponse(
#         {
#             "healthy": bool(AZURE_ENDPOINT and AZURE_API_KEY),
#             "endpoint": AZURE_ENDPOINT[:60] + "..." if AZURE_ENDPOINT else None,
#             "model": VOICELIVE_MODEL,
#             "agent_id": AGENT_ID,
#             "voice": VOICE_NAME,
#             "agent_name": f"DOIT-AI Agent ({AGENT_ID})",
#         }
#     )


# # ── Session configuration payload sent to Azure ─────────────────────────────
# def _build_session_config() -> dict:
#     return {
#         "type": "session.update",
#         "session": {
#             "modalities": ["text", "audio"],
#             "instructions": (
#                 "You are DOIT-AI, an intelligent AI Project Manager powered by Azure AI Foundry. "
#                 "You help teams with project management, sprint tracking, task assignments, risk analysis, "
#                 "and productivity insights. Respond naturally and conversationally. "
#                 "Keep responses concise and focused. You have access to the team's project data."
#             ),
#             "voice": {
#                 "type": "azure-standard",
#                 "name": VOICE_NAME,
#             },
#             "input_audio_format": "pcm16",
#             "output_audio_format": "pcm16",
#             "input_audio_transcription": {"model": "whisper-1"},
#             "turn_detection": {
#                 "type": "server_vad",
#                 "threshold": 0.5,
#                 "prefix_padding_ms": 300,
#                 "silence_duration_ms": 500,
#             },
#         },
#     }


# # ── WebSocket proxy ──────────────────────────────────────────────────────────
# @router.websocket("/voice-live")
# async def voice_live_proxy(
#     websocket: WebSocket,
#     token: str = Query(default=""),
#     tab: str = Query(default=""),
# ):
#     """
#     WebSocket proxy between frontend and Azure AI Foundry VoiceLive.

#     Frontend sends:
#       { type: "session.config", agent_id: "Agent905" }   → triggers session.update
#       { type: "input_audio_buffer.append", audio: <b64> } → forwarded to Azure
#       { type: "response.cancel" }                         → forwarded to Azure

#     Azure sends all standard VoiceLive server events → forwarded to frontend.
#     """
#     if not AZURE_ENDPOINT or not AZURE_API_KEY:
#         await websocket.accept()
#         await websocket.send_json(
#             {
#                 "type": "error",
#                 "error": {
#                     "message": "Azure VoiceLive credentials not configured on server."
#                 },
#             }
#         )
#         await websocket.close(code=1011)
#         return

#     # ── Accept frontend connection ──────────────────────────────────
#     await websocket.accept()
#     logger.info(f"[VoiceLive] Frontend connected (tab={tab[:12]})")

#     # ── Connect to Azure VoiceLive ──────────────────────────────────
#     azure_headers = {
#         "api-key": AZURE_API_KEY,
#         "OpenAI-Beta": "realtime=v1",
#     }

#     try:
#         async with websockets.connect(
#             _AZURE_WSS_URL,
#             additional_headers=azure_headers,
#             max_size=10 * 1024 * 1024,  # 10 MB
#             ping_interval=20,
#             ping_timeout=20,
#             open_timeout=20,
#         ) as azure_ws:
#             logger.info("[VoiceLive] Connected to Azure VoiceLive")

#             # ── Coroutine: frontend → Azure ─────────────────────────
#             async def frontend_to_azure():
#                 try:
#                     async for raw in websocket.iter_text():
#                         try:
#                             msg = json.loads(raw)
#                         except json.JSONDecodeError:
#                             continue

#                         msg_type = msg.get("type", "")

#                         # Session config trigger → send session.update to Azure
#                         if msg_type == "session.config":
#                             session_payload = _build_session_config()
#                             await azure_ws.send(json.dumps(session_payload))
#                             logger.info("[VoiceLive] Session config sent to Azure")

#                         # Audio data → forward directly
#                         elif msg_type == "input_audio_buffer.append":
#                             await azure_ws.send(
#                                 json.dumps(
#                                     {
#                                         "type": "input_audio_buffer.append",
#                                         "audio": msg.get("audio", ""),
#                                     }
#                                 )
#                             )

#                         # Cancel response → forward
#                         elif msg_type == "response.cancel":
#                             await azure_ws.send(json.dumps({"type": "response.cancel"}))

#                         else:
#                             # Forward anything else unchanged
#                             await azure_ws.send(raw)

#                 except WebSocketDisconnect:
#                     logger.info("[VoiceLive] Frontend disconnected")
#                 except Exception as e:
#                     logger.error(f"[VoiceLive] frontend→azure error: {e}")

#             # ── Coroutine: Azure → frontend ─────────────────────────
#             async def azure_to_frontend():
#                 try:
#                     async for raw in azure_ws:
#                         try:
#                             # Forward all Azure events to frontend
#                             if websocket.client_state.value < 3:  # not closed
#                                 await websocket.send_text(
#                                     raw if isinstance(raw, str) else raw.decode()
#                                 )
#                         except Exception as e:
#                             logger.error(f"[VoiceLive] azure→frontend send error: {e}")
#                             break
#                 except websockets.exceptions.ConnectionClosedOK:
#                     logger.info("[VoiceLive] Azure WS closed normally")
#                 except Exception as e:
#                     logger.error(f"[VoiceLive] azure→frontend error: {e}")
#                     try:
#                         await websocket.send_json(
#                             {"type": "error", "error": {"message": str(e)}}
#                         )
#                     except Exception:
#                         pass

#             # ── Run both directions concurrently ────────────────────
#             await asyncio.gather(
#                 frontend_to_azure(),
#                 azure_to_frontend(),
#                 return_exceptions=True,
#             )

#     except websockets.exceptions.InvalidURI as e:
#         logger.error(f"[VoiceLive] Invalid Azure WSS URI: {e}")
#         try:
#             await websocket.send_json(
#                 {
#                     "type": "error",
#                     "error": {"message": f"Invalid Azure endpoint configuration: {e}"},
#                 }
#             )
#         except Exception:
#             pass

#     except (websockets.exceptions.WebSocketException, OSError) as e:
#         logger.error(f"[VoiceLive] Azure connection failed: {e}")
#         try:
#             await websocket.send_json(
#                 {
#                     "type": "error",
#                     "error": {"message": f"Could not connect to Azure VoiceLive: {e}"},
#                 }
#             )
#         except Exception:
#             pass

#     finally:
#         logger.info("[VoiceLive] Proxy session ended")
#         try:
#             await websocket.close()
#         except Exception:
#             pass

"""
voice_live_router.py
────────────────────
WebSocket proxy: Frontend ↔ Azure AI Foundry VoiceLive (Agent905)

FIRST: ensure correct SDK install:
    pip install "azure-ai-voicelive[aiohttp]"

ADD TO main.py:
    from routers.voice_live_router import router as voice_live_router
    app.include_router(voice_live_router, prefix="/api/foundry-agent", tags=["VoiceLive"])

ENV VARS:
    AZURE_VOICELIVE_ENDPOINT  = https://ai-doit2026ai080910479902.cognitiveservices.azure.com/
    AZURE_VOICELIVE_API_KEY   = <resource key from Speech Playground>
    VOICELIVE_MODEL           = gpt-4o-realtime-preview
    VOICELIVE_AGENT_ID        = Agent905
    VOICELIVE_VOICE           = en-US-SteffanDragonNeural

FIX SUMMARY (v2):
    • Added `ws_closed` asyncio.Event so azure_to_frontend stops immediately
      when the frontend disconnects — no more "websocket.send after close" errors.
    • Tasks now cancel each other as soon as one side exits (FIRST_COMPLETED).
    • Pending tasks are cancelled and awaited cleanly before returning.
    • websocket.client_state check replaced with ws_closed flag (more reliable).
    • frontend_to_azure sets ws_closed on exit so azure_to_frontend drains fast.
"""

import os
import json
import asyncio
import logging
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# ── Config ───────────────────────────────────────────────────────────────────
AZURE_ENDPOINT = os.getenv("AZURE_VOICELIVE_ENDPOINT", "").rstrip("/")
AZURE_API_KEY = os.getenv("AZURE_VOICELIVE_API_KEY", "")
VOICELIVE_MODEL = os.getenv("VOICELIVE_MODEL", "gpt-4o-realtime-preview")
AGENT_ID = os.getenv("VOICELIVE_AGENT_ID", "Agent905")
VOICE_NAME = os.getenv("VOICELIVE_VOICE", "en-US-SteffanDragonHDLatest")
PROJECT_ID = os.getenv("VOICELIVE_PROJECT_ID", "doit2026")
PROJECT_NAME = os.getenv("VOICELIVE_PROJECT_NAME", "doit2026")

# ── Startup diagnostics ───────────────────────────────────────────────────────
print("=" * 60)
print("[VoiceLive] Router loading — diagnostics:")
print(f"  ENDPOINT  : {AZURE_ENDPOINT or '❌ NOT SET'}")
print(
    f"  API_KEY   : {'✅ set (' + AZURE_API_KEY[:6] + '...)' if AZURE_API_KEY else '❌ NOT SET'}"
)
print(f"  MODEL     : {VOICELIVE_MODEL}")
print(f"  AGENT_ID  : {AGENT_ID}")
print(f"  VOICE     : {VOICE_NAME}")
print(f"  PROJECT   : {PROJECT_ID}")

try:
    from azure.core.credentials import AzureKeyCredential
    from azure.ai.voicelive.aio import connect as vl_connect
    from azure.ai.voicelive.models import (
        RequestSession,
        ServerVad,
        AzureStandardVoice,
        Modality,
        InputAudioFormat,
        OutputAudioFormat,
        ServerEventType,
    )

    print("  SDK       : ✅ azure-ai-voicelive imported OK")
    _SDK_OK = True
except ImportError as e:
    print(f"  SDK       : ❌ IMPORT ERROR: {e}")
    print("  FIX       : pip install 'azure-ai-voicelive[aiohttp]'")
    _SDK_OK = False

try:
    import aiohttp

    print(f"  aiohttp   : ✅ {aiohttp.__version__}")
    _AIOHTTP_OK = True
except ImportError:
    print("  aiohttp   : ❌ NOT INSTALLED — run: pip install aiohttp")
    _AIOHTTP_OK = False

print("=" * 60)


# ── Health check ─────────────────────────────────────────────────────────────
@router.get("/health")
async def voice_live_health():
    return JSONResponse(
        {
            "healthy": bool(
                AZURE_ENDPOINT and AZURE_API_KEY and _SDK_OK and _AIOHTTP_OK
            ),
            "endpoint": AZURE_ENDPOINT[:60] + "..." if AZURE_ENDPOINT else None,
            "model": VOICELIVE_MODEL,
            "agent_id": AGENT_ID,
            "voice": VOICE_NAME,
            "sdk_ok": _SDK_OK,
            "aiohttp_ok": _AIOHTTP_OK,
        }
    )


# ── Session config ────────────────────────────────────────────────────────────
def _make_session_config():
    """
    Minimal session config — voice as plain string (Azure VoiceLive SDK v1 format).
    Turn detection defaults to server VAD automatically.
    """
    return RequestSession(
        modalities=[Modality.TEXT, Modality.AUDIO],
        instructions=(
            "You are DOIT-AI, an intelligent AI Project Manager for the DOIT team. "
            "Help with sprint tracking, task assignments, risk analysis, and workload balancing. "
            "Respond naturally and concisely, as if speaking to a colleague."
        ),
        voice=VOICE_NAME,
        input_audio_format=InputAudioFormat.PCM16,
        output_audio_format=OutputAudioFormat.PCM16,
    )


# ── Serialization helper ──────────────────────────────────────────────────────
def _make_serializable(obj):
    """Recursively convert Azure SDK objects to JSON-serializable primitives."""
    import base64

    if isinstance(obj, bytes):
        return base64.b64encode(obj).decode()
    if hasattr(obj, "value"):  # enums
        return obj.value
    if hasattr(obj, "model_dump"):  # Pydantic models
        return _make_serializable(obj.model_dump(exclude_none=True))
    if isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_make_serializable(i) for i in obj]
    return obj


# ── WebSocket proxy ───────────────────────────────────────────────────────────
@router.websocket("/voice-live")
async def voice_live_proxy(
    websocket: WebSocket,
    token: str = Query(default=""),
    tab: str = Query(default=""),
):
    await websocket.accept()
    print(f"[VoiceLive] ✅ Frontend WS accepted (tab={tab[:12]})")

    # ── Guard: missing config ─────────────────────────────────────────
    if not AZURE_ENDPOINT or not AZURE_API_KEY:
        msg = "❌ AZURE_VOICELIVE_ENDPOINT or AZURE_VOICELIVE_API_KEY not set in .env"
        print(f"[VoiceLive] {msg}")
        await websocket.send_json({"type": "error", "error": {"message": msg}})
        await websocket.close(code=1011)
        return

    if not _SDK_OK:
        msg = "❌ azure-ai-voicelive SDK not installed. Run: pip install 'azure-ai-voicelive[aiohttp]'"
        print(f"[VoiceLive] {msg}")
        await websocket.send_json({"type": "error", "error": {"message": msg}})
        await websocket.close(code=1011)
        return

    if not _AIOHTTP_OK:
        msg = "❌ aiohttp not installed. Run: pip install aiohttp"
        print(f"[VoiceLive] {msg}")
        await websocket.send_json({"type": "error", "error": {"message": msg}})
        await websocket.close(code=1011)
        return

    # ── Connect to Azure VoiceLive ────────────────────────────────────
    credential = AzureKeyCredential(AZURE_API_KEY)
    print(
        f"[VoiceLive] Connecting SDK → endpoint={AZURE_ENDPOINT} model={VOICELIVE_MODEL} agent={AGENT_ID}"
    )

    try:
        async with vl_connect(
            endpoint=AZURE_ENDPOINT,
            credential=credential,
            model=VOICELIVE_MODEL,
            connection_options={
                "max_msg_size": 10 * 1024 * 1024,
                "heartbeat": 20,
                "timeout": 20,
            },
        ) as conn:
            print("[VoiceLive] ✅ SDK connected to Azure VoiceLive!")
            await websocket.send_json({"type": "proxy.connected"})

            # ── Shared state ──────────────────────────────────────────
            session_ready = asyncio.Event()  # set when session.updated received
            ws_closed = asyncio.Event()  # ← KEY FIX: set when frontend WS closes
            conn_alive = True  # set False when Azure side closes

            # ── Azure → Frontend ──────────────────────────────────────
            async def azure_to_frontend():
                nonlocal conn_alive
                print("[VoiceLive] azure_to_frontend loop started")
                try:
                    async for event in conn:
                        # ── KEY FIX: stop immediately if WS already closed ──
                        if ws_closed.is_set():
                            print(
                                "[VoiceLive] WS closed — draining Azure events silently"
                            )
                            # Continue draining conn so the async-with exits cleanly,
                            # but never touch the websocket again.
                            continue

                        evt_type = str(getattr(event, "type", "?"))

                        # Send session.update after session.created
                        if evt_type == "session.created":
                            print(
                                "[VoiceLive] ← session.created — sending session.update now"
                            )
                            try:
                                session_cfg = _make_session_config()
                                await conn.session.update(session=session_cfg)
                                print("[VoiceLive] ✅ session.update sent")
                            except Exception as e:
                                print(f"[VoiceLive] ❌ session.update failed: {e}")
                                traceback.print_exc()

                        elif evt_type == "session.updated":
                            print(
                                "[VoiceLive] ← session.updated — session READY, audio can flow"
                            )
                            session_ready.set()

                        elif evt_type == "response.audio.delta":
                            # One-time debug: confirm delta bytes are present
                            if not getattr(azure_to_frontend, "_audio_logged", False):
                                delta_val = getattr(event, "delta", None)
                                delta_len = len(delta_val) if delta_val else 0
                                print(
                                    f"[VoiceLive] ← response.audio.delta (first chunk: {delta_len} bytes/chars)"
                                )
                                azure_to_frontend._audio_logged = True

                        elif evt_type != "response.audio.delta":
                            print(f"[VoiceLive] ← {evt_type}")

                        # Serialize and forward — only if WS is still open
                        if ws_closed.is_set():
                            continue

                        try:
                            if hasattr(event, "model_dump"):
                                payload = event.model_dump(exclude_none=False)
                            else:
                                payload = (
                                    vars(event) if hasattr(event, "__dict__") else {}
                                )

                            payload["type"] = evt_type
                            payload = _make_serializable(payload)

                            if evt_type == "error":
                                err_attr = getattr(event, "error", None)
                                if err_attr:
                                    payload["error"] = _make_serializable(
                                        err_attr.model_dump()
                                        if hasattr(err_attr, "model_dump")
                                        else vars(err_attr)
                                    )
                                print(
                                    f"[VoiceLive] AZURE ERROR DETAIL: {json.dumps(payload, default=str)}"
                                )

                            # ── KEY FIX: double-check ws_closed before every send ──
                            if not ws_closed.is_set():
                                await websocket.send_text(
                                    json.dumps(payload, default=str)
                                )

                        except Exception as e:
                            # If we hit a send error here, the WS just closed mid-flight.
                            # Mark it closed and stop sending — do NOT log as an error.
                            if not ws_closed.is_set():
                                print(
                                    f"[VoiceLive] ⚠️  WS send failed (frontend likely disconnected): {e}"
                                )
                                ws_closed.set()

                except Exception as e:
                    print(f"[VoiceLive] ❌ azure_to_frontend error: {e}")
                    traceback.print_exc()
                finally:
                    conn_alive = False
                    session_ready.set()  # unblock frontend_to_azure if it's waiting
                    ws_closed.set()  # signal that we're done, unblock any waiters
                    print("[VoiceLive] azure_to_frontend loop ended")

            # ── Frontend → Azure ──────────────────────────────────────
            async def frontend_to_azure():
                try:
                    async for raw in websocket.iter_text():
                        if not conn_alive:
                            print(
                                "[VoiceLive] Azure conn closed, dropping frontend message"
                            )
                            break

                        try:
                            msg = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        msg_type = msg.get("type", "")

                        if msg_type == "session.config":
                            print(
                                "[VoiceLive] session.config received — waiting for session.updated..."
                            )
                            try:
                                await asyncio.wait_for(
                                    session_ready.wait(), timeout=10.0
                                )
                            except asyncio.TimeoutError:
                                print(
                                    "[VoiceLive] ❌ Timed out waiting for session.updated"
                                )
                                break
                            print("[VoiceLive] session ready, audio flow enabled")

                        elif msg_type == "input_audio_buffer.append":
                            if not session_ready.is_set() or not conn_alive:
                                continue
                            audio_b64 = msg.get("audio", "")
                            if audio_b64:
                                try:
                                    await conn.input_audio_buffer.append(
                                        audio=audio_b64
                                    )
                                except Exception as e:
                                    if conn_alive:
                                        print(f"[VoiceLive] ❌ audio append error: {e}")

                        elif msg_type == "response.cancel":
                            try:
                                await conn.response.cancel()
                            except Exception:
                                pass

                    print("[VoiceLive] Frontend WS closed")

                except WebSocketDisconnect:
                    print("[VoiceLive] Frontend disconnected")
                except Exception as e:
                    print(f"[VoiceLive] ❌ frontend_to_azure error: {e}")
                    traceback.print_exc()
                finally:
                    # ── KEY FIX: always set ws_closed when frontend loop exits ──
                    ws_closed.set()
                    print(
                        "[VoiceLive] frontend_to_azure loop ended, ws_closed signalled"
                    )

            # ── Run both directions; stop when EITHER side finishes ───
            # FIRST_COMPLETED means if the frontend disconnects, we immediately
            # cancel the azure_to_frontend task so it stops trying to send.
            t_a2f = asyncio.create_task(azure_to_frontend(), name="a2f")
            t_f2a = asyncio.create_task(frontend_to_azure(), name="f2a")

            done, pending = await asyncio.wait(
                [t_a2f, t_f2a],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel any still-running task gracefully
            for task in pending:
                print(f"[VoiceLive] Cancelling pending task: {task.get_name()}")
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

            print("[VoiceLive] Session tasks completed")

    except Exception as e:
        print(f"[VoiceLive] ❌ SDK vl_connect() FAILED: {type(e).__name__}: {e}")
        traceback.print_exc()
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": {
                        "message": f"Azure VoiceLive connection failed: {type(e).__name__}: {e}"
                    },
                }
            )
        except Exception:
            pass

    finally:
        print("[VoiceLive] Session ended, closing frontend WS")
        try:
            await websocket.close()
        except Exception:
            pass
