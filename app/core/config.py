from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated


def parse_cors_origins(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)


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
    POSTGRES_PASSWORD: str = "postgres_logtudo_senha_segura"
    POSTGRES_DB: str = "torre_de_controle"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres_logtudo_senha_segura@localhost:5432/torre_de_controle"

    # JWT
    # openssl rand -hex 32
    JWT_SECRET_KEY: str = "945fa8b309db809f40824b22c7a3c3065a7e12726bbefb8c199583bcf3d84950"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_cors_origins)
    ] = []


settings = Settings()
