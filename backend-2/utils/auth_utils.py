import jwt
import datetime
from datetime import timezone
import bcrypt
import hashlib
import uuid
from config import JWT_SECRET, JWT_EXPIRY_HOURS
from functools import wraps
from database import db
from bson import ObjectId

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8"))

def generate_token_id(user_id: str, timestamp: str) -> str:
    unique_string = f"{user_id}:{timestamp}"
    return hashlib.sha256(unique_string.encode()).hexdigest()[:32]

def generate_device_fingerprint(ip_address: str, user_agent: str) -> str:
    fingerprint_data = f"{ip_address}:{user_agent}"
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:32]

def generate_session_id() -> str:
    return str(uuid.uuid4())

def create_token(user_id: str, ip_address: str = None, user_agent: str = None) -> tuple:
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"token_version": 1})
    token_version = user.get("token_version", 1) if user else 1
    
    device_fingerprint = generate_device_fingerprint(ip_address or "unknown", user_agent or "unknown")
    
    previous_sessions = db.sessions.update_many(
        {"user_id": ObjectId(user_id), "is_active": True},
        {
            "$set": {
                "is_active": False,
                "ended_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None),
                "end_reason": "new_login_detected"
            }
        }
    )
    
    if previous_sessions.modified_count > 0:
        print(f"[SECURITY] Auto-logged out {previous_sessions.modified_count} previous session(s) for user {user_id}")
    
    session_id = generate_session_id()
    tab_session_key = str(uuid.uuid4())
    
    timestamp = datetime.datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    token_id = generate_token_id(str(user_id), timestamp)
    
    payload = {
        "user_id": str(user_id),
        "session_id": session_id,
        "tab_key": tab_session_key,
        "token_id": token_id,
        "token_version": token_version,
        "device_fp": device_fingerprint,
        "exp": datetime.datetime.now(timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.datetime.now(timezone.utc).replace(tzinfo=None),
    }
    
    if ip_address:
        payload["ip"] = ip_address
    if user_agent:
        payload["ua_hash"] = hashlib.md5(user_agent.encode()).hexdigest()[:16]
    
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    
    session_data = {
        "session_id": session_id,
        "tab_session_key": tab_session_key,
        "user_id": ObjectId(user_id),
        "token_id": token_id,
        "device_fingerprint": device_fingerprint,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None),
        "expires_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
        "is_active": True
    }
    db.sessions.insert_one(session_data)
    
    return token, token_id, tab_session_key


def verify_token_for_websocket(token: str):
    """
    Simplified token verification for WebSocket connections.
    Bypasses device fingerprint checks since WebSocket headers differ from HTTP.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        session_id = payload.get("session_id")
        token_id = payload.get("token_id")
        
        if not user_id or not session_id:
            print(f"[WS AUTH] Token missing user_id or session_id")
            return None
        
        if token_id:
            blacklisted = db.token_blacklist.find_one({"token_id": token_id})
            if blacklisted:
                print(f"[WS AUTH] Blacklisted token attempted: {token_id}")
                return None
        
        user = db.users.find_one({"_id": ObjectId(user_id)}, {"token_version": 1})
        if not user:
            return None
        
        token_version = payload.get("token_version", 1)
        if token_version != user.get("token_version", 1):
            return None
        
        session = db.sessions.find_one({
            "session_id": session_id,
            "user_id": ObjectId(user_id),
            "is_active": True
        })
        
        if not session:
            return None
        
        print(f"[WS AUTH] ✓ Token verified for user: {user_id}")
        return user_id
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception as e:
        print(f"[WS AUTH] Error: {str(e)}")
        return None


def verify_token(
    token: str,
    ip_address: str = None,
    user_agent: str = None,
    tab_session_key: str = None,
    skip_tab_validation: bool = False,
    skip_device_check: bool = False,       # ← NEW: explicit bypass flag
):
    """
    Verify JWT token with security checks.

    Pass skip_device_check=True (set by dependencies.py for agent/chat/meeting
    endpoints) to bypass the device-fingerprint comparison entirely.
    Pass ip_address=None to achieve the same effect implicitly.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["user_id"]
        token_id = payload.get("token_id")
        token_version = payload.get("token_version", 1)
        token_device_fp = payload.get("device_fp")
        token_tab_key = payload.get("tab_key")

        # ── Check 1: Blacklisted? ─────────────────────────────────────────────
        if token_id and is_token_blacklisted(token_id):
            print(f"[SECURITY] Blacklisted token attempted: {token_id}")
            return None

        # ── Check 2: Token version ────────────────────────────────────────────
        user = db.users.find_one({"_id": ObjectId(user_id)}, {"token_version": 1})
        if not user:
            return None
        
        current_version = user.get("token_version", 1)
        if token_version != current_version:
            print(f"[SECURITY] Invalid token version: {token_version} vs {current_version}")
            return None

        # ── Check 3: Session exists and belongs to this user ──────────────────
        session_id = payload.get("session_id")
        if not session_id:
            print(f"[SECURITY] Token missing session_id")
            return None

        session = db.sessions.find_one({
            "session_id": session_id,
            "user_id": ObjectId(user_id),
            "is_active": True
        })

        if not session:
            stolen_session = db.sessions.find_one({"session_id": session_id})
            if stolen_session:
                actual_owner = str(stolen_session.get("user_id"))
                if actual_owner != user_id:
                    print(f"[SECURITY] 🚨 TOKEN THEFT DETECTED!")
                    db.security_logs.insert_one({
                        "user_id": ObjectId(user_id),
                        "token_id": token_id,
                        "event": "token_theft_attempt",
                        "severity": "critical",
                        "details": {
                            "session_id": session_id,
                            "token_owner": actual_owner,
                            "attempted_by": user_id,
                            "ip": ip_address,
                            "user_agent": (user_agent or "")[:100]
                        },
                        "timestamp": datetime.datetime.now(timezone.utc).replace(tzinfo=None)
                    })
                    if token_id:
                        blacklist_token(token_id, user_id, "token_theft_detected")
                else:
                    print(f"[SECURITY] Session inactive for user {user_id} (expired or logged out)")
            else:
                print(f"[SECURITY] Session not found: {session_id}")
            return None

        # ── Check 4: Device fingerprint ───────────────────────────────────────
        # SKIPPED when:
        #   a) skip_device_check=True  (passed by dependencies.py for API endpoints
        #      where User-Agent legitimately varies: meetings, chat, agents, etc.)
        #   b) ip_address is None      (implicit sentinel — same effect)
        #   c) token or session has no fingerprint stored
        #
        # This prevents false positives caused by:
        #   - ngrok proxy altering headers
        #   - fetch() vs XHR sending slightly different UA strings
        #   - mobile browsers reporting different UA on different requests
        device_check_possible = (
            token_device_fp
            and session.get("device_fingerprint")
            and ip_address is not None          # ← KEY GUARD
            and not skip_device_check           # ← explicit bypass
        )

        if device_check_possible:
            current_device_fp = generate_device_fingerprint(ip_address, user_agent or "unknown")
            session_device_fp = session.get("device_fingerprint")

            if current_device_fp != session_device_fp:
                print(f"[SECURITY] 🚨 DEVICE MISMATCH DETECTED!")
                print(f"   Session ID: {session_id}")
                print(f"   User ID: {user_id}")
                print(f"   Token device FP: {token_device_fp}")
                print(f"   Session device FP: {session_device_fp}")
                print(f"   Current device FP: {current_device_fp}")

                db.security_logs.insert_one({
                    "user_id": ObjectId(user_id),
                    "session_id": session_id,
                    "event": "device_fingerprint_mismatch",
                    "severity": "critical",
                    "details": {
                        "expected_fp": session_device_fp,
                        "received_fp": current_device_fp,
                        "ip": ip_address,
                        "user_agent": (user_agent or "")[:100]
                    },
                    "timestamp": datetime.datetime.now(timezone.utc).replace(tzinfo=None)
                })

                db.sessions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "is_active": False,
                            "ended_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None),
                            "end_reason": "device_fingerprint_mismatch"
                        }
                    }
                )

                if token_id:
                    blacklist_token(token_id, user_id, "device_mismatch")

                return None

        # ── Check 5: Tab session key ──────────────────────────────────────────
        if not skip_tab_validation and token_tab_key and session.get("tab_session_key"):
            if not tab_session_key:
                print(f"[SECURITY] ❌ TAB SESSION KEY MISSING")
                db.security_logs.insert_one({
                    "user_id": ObjectId(user_id),
                    "session_id": session_id,
                    "event": "tab_key_missing_blocked",
                    "severity": "high",
                    "details": {"ip": ip_address, "user_agent": (user_agent or "")[:100]},
                    "timestamp": datetime.datetime.now(timezone.utc).replace(tzinfo=None)
                })
                return None

            elif tab_session_key and session.get("tab_session_key") != tab_session_key:
                print(f"[SECURITY] ❌ TAB SESSION KEY MISMATCH")
                db.security_logs.insert_one({
                    "user_id": ObjectId(user_id),
                    "session_id": session_id,
                    "event": "tab_session_key_mismatch_blocked",
                    "severity": "high",
                    "details": {
                        "expected_key": session.get("tab_session_key"),
                        "received_key": tab_session_key,
                        "ip": ip_address,
                        "user_agent": (user_agent or "")[:100]
                    },
                    "timestamp": datetime.datetime.now(timezone.utc).replace(tzinfo=None)
                })
                return None

        return user_id

    except jwt.ExpiredSignatureError:
        print("[SECURITY] Expired token attempted")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[SECURITY] Invalid token: {str(e)}")
        return None
    except Exception as e:
        print(f"[SECURITY] Token verification error: {str(e)}")
        return None


def is_token_blacklisted(token_id: str) -> bool:
    return db.token_blacklist.find_one({"token_id": token_id}) is not None


def blacklist_token(token_id: str, user_id: str, reason: str = "logout", session_id: str = None):
    try:
        db.token_blacklist.insert_one({
            "token_id": token_id,
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "blacklisted_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None),
            "reason": reason,
            "expires_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=JWT_EXPIRY_HOURS + 24)
        })

        if session_id:
            db.sessions.update_one(
                {"session_id": session_id},
                {"$set": {"is_active": False, "ended_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None), "end_reason": reason}}
            )
        else:
            db.sessions.update_one(
                {"token_id": token_id},
                {"$set": {"is_active": False, "ended_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None), "end_reason": reason}}
            )

        print(f"[SECURITY] Token blacklisted: {token_id} (reason: {reason})")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to blacklist token: {str(e)}")
        return False


def revoke_all_user_tokens(user_id: str, reason: str = "security_action"):
    try:
        db.users.update_one({"_id": ObjectId(user_id)}, {"$inc": {"token_version": 1}})
        db.sessions.update_many(
            {"user_id": ObjectId(user_id), "is_active": True},
            {"$set": {"is_active": False, "ended_at": datetime.datetime.now(timezone.utc).replace(tzinfo=None)}}
        )
        print(f"[SECURITY] All tokens revoked for user {user_id} (reason: {reason})")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to revoke tokens: {str(e)}")
        return False


def get_active_sessions(user_id: str, limit: int = 10):
    sessions = list(db.sessions.find(
        {"user_id": ObjectId(user_id), "is_active": True},
        {"token_id": 1, "ip_address": 1, "user_agent": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit))

    for session in sessions:
        session["_id"] = str(session["_id"])
        session["token_id"] = session.get("token_id", "unknown")

    return sessions