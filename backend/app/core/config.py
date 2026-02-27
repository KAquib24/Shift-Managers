from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "workforce_user"
    DB_PASSWORD: str = "workforce_pass"
    DB_NAME: str = "workforce_db"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # App
    APP_NAME: str = "Workforce Management"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # This allows extra fields in .env

@lru_cache()
def get_settings():
    return Settings()