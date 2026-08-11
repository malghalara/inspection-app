from beanie import Document, Indexed
from pydantic import EmailStr, Field
from datetime import datetime
from typing import Optional

class User(Document):
    name: str
    email: Indexed(EmailStr, unique=True)
    password_hash: str
    role: str = "user"
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None

    verification_otp: Optional[str] = None
    verification_otp_expires_at: Optional[datetime] = None

    reset_otp: Optional[str] = None
    reset_otp_expires_at: Optional[datetime] = None
    reset_token: Optional[str] = None
    reset_token_expires_at: Optional[datetime] = None

    refresh_token: Optional[str] = None

    class Settings:
        name = "users"