from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # =========================
    # DATABASE
    # =========================
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "workforce"

    # =========================
    # REDIS
    # =========================
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # =========================
    # SECURITY / JWT
    # =========================
    SECRET_KEY: str = "dev-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # =========================
    # APP SETTINGS
    # =========================
    APP_NAME: str = "Workforce Management"
    DEBUG: bool = True
    APP_ENV: str = "development"

    # =========================
    # Pydantic Settings Config
    # =========================
    model_config = {
        "env_file": ".env",        # load environment variables
        "extra": "ignore",         # ignore unknown variables
        "case_sensitive": False
    }

@lru_cache()
def get_settings():
    return Settings()