from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Inspection App API"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "inspection_app"
    jwt_secret: str = "changeme-in-env"
    environment: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()