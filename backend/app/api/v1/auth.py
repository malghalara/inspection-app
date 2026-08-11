import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from jose import JWTError

from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, VerifyRequest, ResendVerificationRequest,
    LoginRequest, TokenResponse, ForgotPasswordRequest,
    VerifyResetOtpRequest, SetNewPasswordRequest,
)
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.email import send_verification_otp, send_password_reset_otp, send_password_reset_link

router = APIRouter(prefix="/auth", tags=["auth"])

def generate_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    if await User.find_one(User.email == payload.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    otp = generate_otp()
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        verification_otp=otp,
        verification_otp_expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    await user.insert()
    await send_verification_otp(user.email, otp)
    return {"message": "Registered. Check your email for the verification code."}

@router.post("/verify")
async def verify(payload: VerifyRequest):
    user = await User.find_one(User.email == payload.email)
    if not user or user.verification_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if user.verification_otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code expired")

    user.is_verified = True
    user.verification_otp = None
    user.verification_otp_expires_at = None
    await user.save()
    return {"message": "Account verified. You can now log in."}

@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest):
    user = await User.find_one(User.email == payload.email)
    if user and not user.is_verified:
        otp = generate_otp()
        user.verification_otp = otp
        user.verification_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
        await user.save()
        await send_verification_otp(user.email, otp)
    return {"message": "If that account exists and is unverified, a new code has been sent."}

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await User.find_one(User.email == payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="ACCOUNT_NOT_VERIFIED")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    access_token = create_access_token(str(user.id), user.role)
    refresh_token = create_refresh_token(str(user.id))
    user.refresh_token = refresh_token
    user.last_login_at = datetime.utcnow()
    await user.save()
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await User.get(payload["sub"])
    if not user or user.refresh_token != refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    return TokenResponse(access_token=create_access_token(str(user.id), user.role))

@router.post("/logout")
async def logout(refresh_token: str):
    try:
        payload = decode_token(refresh_token)
        user = await User.get(payload["sub"])
        if user:
            user.refresh_token = None
            await user.save()
    except JWTError:
        pass
    return {"message": "Logged out"}

@router.post("/password-reset/request")
async def forgot_password(payload: ForgotPasswordRequest):
    user = await User.find_one(User.email == payload.email)
    if user:
        otp = generate_otp()
        user.reset_otp = otp
        user.reset_otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
        await user.save()
        await send_password_reset_otp(user.email, otp)
    return {"message": "If that email exists, a reset code has been sent."}

@router.post("/password-reset/verify-otp")
async def verify_reset_otp(payload: VerifyResetOtpRequest):
    user = await User.find_one(User.email == payload.email)
    if not user or user.reset_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid code")
    if user.reset_otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired")

    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires_at = datetime.utcnow() + timedelta(minutes=15)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    await user.save()

    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    await send_password_reset_link(user.email, reset_link)
    return {"message": "Verified. Check your email for the reset link."}

@router.post("/password-reset/confirm")
async def set_new_password(payload: SetNewPasswordRequest):
    user = await User.find_one(User.reset_token == payload.reset_token)
    if not user or user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    await user.save()
    return {"message": "Password updated. You can now log in."}