from fastapi import APIRouter, Depends, Query, Body, UploadFile, File, WebSocket, WebSocketDisconnect
from controllers import team_chat_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
from utils.websocket_manager import manager
from utils.auth_utils import verify_token_for_websocket
import json

router = APIRouter()


@router.get("/projects")
async def get_user_chat_projects(
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.get_user_chat_projects(user_id)
    return handle_controller_response(response)


@router.get("/projects/{project_id}/channels")
async def get_project_channels(
    project_id: str,
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.get_project_channels(project_id, user_id)
    return handle_controller_response(response)


@router.post("/projects/{project_id}/channels")
async def create_channel(
    project_id: str,
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.create_channel(project_id, user_id, payload)
    return handle_controller_response(response)


@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: str,
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.delete_channel(channel_id, user_id)
    return handle_controller_response(response)


@router.get("/channels/{channel_id}/messages")
async def get_channel_messages(
    channel_id: str,
    limit: int = Query(50),
    before: str | None = Query(None),
    user_id: str = Depends(get_current_user)
):
    query_params = {"limit": limit}
    if before:
        query_params["before"] = before

    response = team_chat_controller.get_channel_messages(
        channel_id, user_id, query_params
    )
    return handle_controller_response(response)


@router.post("/channels/{channel_id}/messages")
async def send_message(
    channel_id: str,
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.send_message(
        channel_id, user_id, payload
    )
    return handle_controller_response(response)


@router.put("/channels/{channel_id}/messages/{message_id}")
async def edit_message(
    channel_id: str,
    message_id: str,
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.edit_message(
        channel_id, message_id, user_id, payload
    )
    return handle_controller_response(response)


@router.delete("/channels/{channel_id}/messages/{message_id}")
async def delete_message(
    channel_id: str,
    message_id: str,
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.delete_message(
        channel_id, message_id, user_id
    )
    return handle_controller_response(response)


@router.post("/channels/{channel_id}/messages/{message_id}/reactions")
async def add_reaction(
    channel_id: str,
    message_id: str,
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.add_reaction(
        channel_id, message_id, user_id, payload
    )
    return handle_controller_response(response)


@router.post("/channels/{channel_id}/messages/{message_id}/replies")
async def post_thread_reply(
    channel_id: str,
    message_id: str,
    payload: dict = Body(...),
    user_id: str = Depends(get_current_user)
):
    response = team_chat_controller.post_thread_reply(
        channel_id, message_id, user_id, payload
    )
    return handle_controller_response(response)


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    response = await team_chat_controller.upload_attachment(file, user_id)
    return handle_controller_response(response)


@router.websocket("/ws/{channel_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    channel_id: str,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time team chat
    Requires authentication via token query parameter
    """
    # Authenticate user using WebSocket-friendly verification
    try:
        user_id = verify_token_for_websocket(token)
        if not user_id:
            await websocket.close(code=1008, reason="Invalid or expired token")
            return
    except Exception as e:
        print(f"[WS] Authentication failed: {str(e)}")
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Verify user has access to the channel
    access_check = team_chat_controller.verify_channel_access(channel_id, user_id)
    if not access_check.get("success"):
        await websocket.close(code=1008, reason="Access denied")
        return
    
    # Connect to WebSocket
    await manager.connect(websocket, channel_id, user_id)
    
    # Send connection confirmation
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "channel_id": channel_id,
        "user_id": user_id,
        "timestamp": team_chat_controller.get_current_iso_time()
    })
    
    # Broadcast user joined to others in channel
    await manager.broadcast_to_channel({
        "type": "user_joined",
        "user_id": user_id,
        "channel_id": channel_id,
        "timestamp": team_chat_controller.get_current_iso_time()
    }, channel_id, exclude_user=user_id)
    
    try:
        while True:
            # Keep connection alive and handle any client messages
            data = await websocket.receive_text()
            
            # Handle ping/pong for keepalive
            try:
                message_data = json.loads(data)
                if message_data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": team_chat_controller.get_current_iso_time()
                    })
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(channel_id, user_id)
        print(f"[WS] User {user_id} disconnected from channel {channel_id}")
        
        # Notify others that user left
        await manager.broadcast_to_channel({
            "type": "user_left",
            "user_id": user_id,
            "channel_id": channel_id,
            "timestamp": team_chat_controller.get_current_iso_time()
        }, channel_id)
    except Exception as e:
        print(f"[WS] Error in websocket connection: {str(e)}")
        manager.disconnect(channel_id, user_id)
        try:
            await websocket.close()
        except:
            pass
