import uuid
import datetime
import logging
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from app.database import db_manager
from app.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.models.schemas import UserRegisterRequest, UserLoginRequest, UserResponse, AuthResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger("ai_study_assistant.auth_router")

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Dependency to extract user from Authorization header if present."""
    if not authorization:
        return None
    try:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            payload = decode_access_token(token)
            if payload and "user_id" in payload:
                user = db_manager.get_user_by_id(payload["user_id"])
                return user
    except Exception as e:
        logger.warning(f"Error parsing auth token: {e}")
    return None

@router.post("/register", response_model=AuthResponse)
def register(request: UserRegisterRequest):
    """Registers a new user account."""
    clean_email = request.email.strip().lower()
    clean_username = request.username.strip().lower()

    if len(request.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    # Check if user already exists
    if db_manager.get_user_by_email(clean_email):
        raise HTTPException(status_code=400, detail="Account with this email already exists.")
    if db_manager.get_user_by_username(clean_username):
        raise HTTPException(status_code=400, detail="Username already taken. Please choose another.")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pwd = hash_password(request.password)
    now = datetime.datetime.utcnow().isoformat()

    user_dict = {
        "user_id": user_id,
        "username": request.username.strip(),
        "email": clean_email,
        "full_name": request.full_name or request.username.strip(),
        "password_hash": hashed_pwd,
        "created_at": now
    }
    db_manager.save_user(user_dict)

    # Generate token
    token = create_access_token({"user_id": user_id, "username": user_dict["username"], "email": clean_email})

    user_res = UserResponse(
        user_id=user_id,
        username=user_dict["username"],
        email=clean_email,
        full_name=user_dict["full_name"],
        created_at=now
    )

    return AuthResponse(
        token=token,
        user=user_res,
        message="Registration successful! Welcome to AI Study Assistant."
    )

@router.post("/login", response_model=AuthResponse)
def login(request: UserLoginRequest):
    """Logs in an existing user with email or username."""
    identifier = request.email_or_username.strip().lower()
    
    # Try find by email or username
    user = db_manager.get_user_by_email(identifier)
    if not user:
        user = db_manager.get_user_by_username(identifier)

    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email/username or password.")

    token = create_access_token({
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"]
    })

    user_res = UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
        full_name=user.get("full_name") or user["username"],
        created_at=user.get("created_at", "")
    )

    return AuthResponse(
        token=token,
        user=user_res,
        message=f"Welcome back, {user_res.username}!"
    )

@router.get("/me", response_model=UserResponse)
def get_me(authorization: Optional[str] = Header(None)):
    """Returns the profile of the currently authenticated user."""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated or token expired.")

    return UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
        full_name=user.get("full_name") or user["username"],
        created_at=user.get("created_at", "")
    )
