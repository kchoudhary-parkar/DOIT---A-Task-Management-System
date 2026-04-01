import json
from datetime import datetime, timezone

def json_response(data, status=200):
    return {
        "status": status,
        "headers": [("Content-Type", "application/json")],
        "body": json.dumps(data)
    }

def success_response(data, status=200):
    return json_response(data, status)

def error_response(message, status=400):
    return json_response({"error": message}, status)

def datetime_to_iso(dt):
    """Convert datetime to ISO format string with UTC timezone"""
    if dt is None:
        return None
    # If already a string, return as-is
    if isinstance(dt, str):
        return dt
    # MongoDB stores datetime as naive UTC datetime, so we add UTC timezone info
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()