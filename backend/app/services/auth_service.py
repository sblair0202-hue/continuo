import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.models.domain import AuditLog, User

SECRET_KEY = os.getenv("JWT_SECRET", "continuo-jwt-secret-change-before-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 10


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "role": role, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def log_audit(db: Session, event_type: str, user_id: str, details: str = "") -> None:
    db.add(AuditLog(event_type=event_type, user_id=user_id, details=details))
    db.commit()


def get_current_user(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_token(authorization[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    return payload["sub"]


def seed_admin(db: Session) -> None:
    if db.query(User).filter(User.email == "sblair0202@gmail.com").first():
        return
    admin_pass = os.getenv("ADMIN_PASSWORD", "Continuo2024!")
    db.add(User(
        user_id="sarah",
        email="sblair0202@gmail.com",
        password_hash=hash_password(admin_pass),
        display_name="Sarah",
        role="admin",
    ))
    db.commit()
