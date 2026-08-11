from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    app_name: str = "Inspection App API"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "inspection_app"
    jwt_secret: str = "changeme-in-env"
    environment: str = "development"
    resend_api_key: str = ""
    email_from: str = "onboarding@resend.dev"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"

settings = Settings()