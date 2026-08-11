import logging

logger = logging.getLogger("email_service")
logging.basicConfig(level=logging.INFO)

async def send_email(to: str, subject: str, body: str):
    logger.info(f"\n--- EMAIL to {to} ---\nSubject: {subject}\n{body}\n---------------------\n")

async def send_verification_otp(to: str, otp: str):
    await send_email(to, "Verify your account", f"Your verification code is: {otp} (expires in 10 minutes)")

async def send_password_reset_otp(to: str, otp: str):
    await send_email(to, "Password reset code", f"Your password reset code is: {otp} (expires in 10 minutes)")

async def send_password_reset_link(to: str, link: str):
    await send_email(to, "Reset your password", f"Click to reset your password: {link} (expires in 15 minutes)")