# utils/router_helpers.py
"""
Helper utilities for FastAPI routers to handle controller responses
"""
import json
from fastapi import HTTPException

def handle_controller_response(response):
    """
    Process controller response and raise HTTPException if error
    
    Controllers return format:
    {
        "success": True/False,
        "status": 200,
        "headers": [...],
        "body": json.dumps({...})  # JSON string
    }
    
    This function:
    1. Extracts the body
    2. Parses it if it's a JSON string
    3. Raises HTTPException if status >= 400
    4. Returns the parsed body data
    """
    status_code = response.get("status", 500)
    body = response.get("body", "{}")
    
    # Parse body if it's a string
    if isinstance(body, str):
        try:
            body_data = json.loads(body)
        except json.JSONDecodeError:
            body_data = {"error": body}
    else:
        body_data = body
    
    # Raise HTTPException if error
    if status_code >= 400:
        error_msg = body_data.get("error", "Unknown error")
        if isinstance(error_msg, dict):
            error_msg = json.dumps(error_msg)
        raise HTTPException(status_code=status_code, detail=error_msg)
    
    return body_data