import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import httpx
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


def verify_google_token(id_token: str) -> dict:
    """Verify a Google ID token via tokeninfo endpoint. Returns payload dict."""
    resp = httpx.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": id_token},
        timeout=10,
    )
    if resp.status_code != 200:
        raise ValueError("Invalid Google token")
    data = resp.json()
    if "error_description" in data:
        raise ValueError(f"Google: {data['error_description']}")
    ios_client_id = os.getenv("GOOGLE_IOS_CLIENT_ID", "")
    web_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    allowed = {c for c in (ios_client_id, web_client_id) if c}
    if allowed and data.get("aud") not in allowed:
        raise ValueError("Google token audience mismatch")
    return data


def verify_apple_token(identity_token: str) -> dict:
    """Verify an Apple identity token using Apple's public keys."""
    from jose import jwt as jose_jwt
    keys_resp = httpx.get("https://appleid.apple.com/auth/keys", timeout=10)
    keys = keys_resp.json().get("keys", [])
    header = jose_jwt.get_unverified_header(identity_token)
    matching_key = next((k for k in keys if k.get("kid") == header.get("kid")), None)
    if not matching_key:
        raise ValueError("Apple signing key not found")
    payload = jose_jwt.decode(
        identity_token,
        matching_key,
        algorithms=["RS256"],
        audience="com.sarahblair.continuo",
        issuer="https://appleid.apple.com",
    )
    return payload


def create_or_get_oauth_user(
    db: Session,
    email: str,
    display_name: str,
    oauth_provider: str,
    oauth_id: str,
) -> "User":
    """Find or create a user from OAuth sign-in. Links to existing account by email."""
    email = email.lower().strip()

    # 1. Find by oauth_id (returning user)
    user = db.query(User).filter(
        User.oauth_provider == oauth_provider,
        User.oauth_id == oauth_id,
    ).first()
    if user:
        return user

    # 2. Find by email (link OAuth to existing account)
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.oauth_provider = oauth_provider
        user.oauth_id = oauth_id
        if not user.display_name and display_name:
            user.display_name = display_name
        db.commit()
        return user

    # 3. Create new user
    short_id = oauth_id[:12] if len(oauth_id) >= 12 else oauth_id
    new_user = User(
        user_id=f"{oauth_provider}_{short_id}",
        email=email,
        password_hash=None,
        display_name=display_name or email.split("@")[0],
        oauth_provider=oauth_provider,
        oauth_id=oauth_id,
        role="standard",
    )
    db.add(new_user)
    db.commit()
    return new_user


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
