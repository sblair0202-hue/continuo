import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import User
from app.services.auth_service import (
    create_access_token, decode_token, log_audit, verify_password,
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
    if not user or not verify_password(data.password, user.password_hash):
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
