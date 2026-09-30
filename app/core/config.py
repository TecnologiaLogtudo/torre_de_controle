from typing import Any, List, Union
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict




class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Torre de Controle Logtudo"
    ENVIRONMENT: str = "desenvolvimento"
    API_V1_STR: str = "/api/v1"
    TIMEZONE: str = "America/Bahia"

    # PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "torre_de_controle"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = ""

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "Settings":
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self

    # JWT
    # openssl rand -hex 32
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        raw_list: List[str] = []
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    raw_list = json.loads(v)
                except Exception:
                    raw_list = [v]
            else:
                raw_list = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            raw_list = [str(i) for i in v]

        # Normaliza para extrair o Origin puro (scheme://netloc), pois navegadores nunca enviam path no header Origin
        from urllib.parse import urlsplit
        origins: List[str] = []
        for item in raw_list:
            item = item.strip()
            if not item:
                continue
            origins.append(item)
            if item.startswith(("http://", "https://")):
                parts = urlsplit(item)
                if parts.scheme and parts.netloc:
                    origin_only = f"{parts.scheme}://{parts.netloc}"
                    if origin_only != item:
                        origins.append(origin_only)
        return list(dict.fromkeys(origins))


settings = Settings()

