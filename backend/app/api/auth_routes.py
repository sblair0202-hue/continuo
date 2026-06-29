import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import User
from app.services.auth_service import (
    create_access_token, create_or_get_oauth_user, decode_token,
    log_audit, verify_apple_token, verify_google_token, verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory rate limiting: max 10 attempts per IP per 5 minutes
_login_attempts: dict[str, list[float]] = {}
_MAX_ATTEMPTS = 10
_WINDOW = 300.0


def _rate_check(ip: str) -> None:
    now = time.time()
    recent = [t for t in _login_attempts.get(ip, []) if now - t < _WINDOW]
    if len(recent) >= _MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")
    recent.append(now)
    _login_attempts[ip] = recent


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    _rate_check(ip)

    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        log_audit(db, "login_failed", data.email.lower().strip(), f"IP:{ip}")
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    log_audit(db, "login", user.user_id, f"IP:{ip}")
    return {
        "access_token": create_access_token(user.user_id, user.role),
        "token_type": "bearer",
        "user_id": user.user_id,
        "display_name": user.display_name or user.email,
        "role": user.role,
    }


class GoogleSignInRequest(BaseModel):
    id_token: str


class AppleSignInRequest(BaseModel):
    identity_token: str
    email: Optional[str] = None
    full_name: Optional[str] = None


def _oauth_response(user: User) -> dict:
    return {
        "access_token": create_access_token(user.user_id, user.role),
        "token_type": "bearer",
        "user_id": user.user_id,
        "display_name": user.display_name or user.email,
        "role": user.role,
    }


@router.post("/google")
def google_sign_in(data: GoogleSignInRequest, db: Session = Depends(get_db)):
    try:
        payload = verify_google_token(data.id_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google sign-in failed: {e}")
    user = create_or_get_oauth_user(
        db,
        email=payload.get("email", ""),
        display_name=payload.get("name", ""),
        oauth_provider="google",
        oauth_id=payload["sub"],
    )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")
    log_audit(db, "login_google", user.user_id)
    return _oauth_response(user)


@router.post("/apple")
def apple_sign_in(data: AppleSignInRequest, db: Session = Depends(get_db)):
    try:
        payload = verify_apple_token(data.identity_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Apple sign-in failed: {e}")
    email = data.email or payload.get("email", "")
    user = create_or_get_oauth_user(
        db,
        email=email,
        display_name=data.full_name or "",
        oauth_provider="apple",
        oauth_id=payload["sub"],
    )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")
    log_audit(db, "login_apple", user.user_id)
    return _oauth_response(user)


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_token(header[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    user = db.query(User).filter(User.user_id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return {
        "user_id": user.user_id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
    }


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        payload = decode_token(header[7:])
        if payload:
            log_audit(db, "logout", payload["sub"])
    return {"status": "logged_out"}
