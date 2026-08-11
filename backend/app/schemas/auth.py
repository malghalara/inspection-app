from pydantic import BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)

class VerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class SetNewPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=8)