from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMMA_MODEL_ID: str = "gemma-4-31b-it"
    DEMO_MODE: bool = True
    ALLOW_RESET: bool = False
    DATABASE_URL: str = "sqlite:///./yogsetu.db"
    YOGSETU_DB_URL: str = ""  # Override DATABASE_URL if set (avoids Render conflict)
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://yogsetu-frontend.onrender.com,https://yogsetu.onrender.com"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def db_url(self) -> str:
        """Use YOGSETU_DB_URL if set, else fallback to DATABASE_URL if valid, else default sqlite."""
        for candidate in [self.YOGSETU_DB_URL, self.DATABASE_URL]:
            if candidate and any(candidate.startswith(p) for p in ("sqlite", "postgresql", "postgres", "mysql")):
                return candidate
        return "sqlite:///./yogsetu.db"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
