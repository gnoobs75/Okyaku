from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration settings."""

    # Application
    APP_NAME: str = "Okyaku CRM"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production-use-openssl-rand-hex-32"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/okyaku"

    # File Storage (local)
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB

    # Email (local mock - set USE_SMTP=true to use real SMTP)
    USE_SMTP: bool = False
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@okyaku.local"
    SMTP_FROM_NAME: str = "Okyaku CRM"

    # Social Media OAuth (optional - for testing can be empty)
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    TWITTER_CLIENT_ID: str = ""
    TWITTER_CLIENT_SECRET: str = ""
    TWITTER_BEARER_TOKEN: str = ""
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""

    # Social Media Publishing
    SOCIAL_POST_RETRY_LIMIT: int = 3
    SOCIAL_POST_RETRY_DELAY: int = 300  # seconds

    # AI Configuration - Ollama (Self-Hosted)
    # Ollama runs locally and provides OpenAI-compatible API
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "llama3.1"  # Main LLM model
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"  # For embeddings/RAG

    # AI Settings
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.7
    AI_PROVIDER: str = "ollama"  # "ollama" or "anthropic" for fallback

    # AI Feature Flags
    AI_AGENTS_ENABLED: bool = True
    AI_PREDICTIONS_ENABLED: bool = True
    AI_CHAT_ENABLED: bool = True
    AI_RAG_ENABLED: bool = False  # Enable after pgvector setup
    AI_REQUIRE_APPROVAL_FOR_WRITES: bool = True  # Human-in-the-loop

    # Performance Settings
    WARMUP_MODELS_ON_STARTUP: bool = False  # Set to True to preload models into VRAM
    PERFORMANCE_LOG_SLOW_REQUESTS_MS: int = 1000  # Log requests slower than this
    PERFORMANCE_LOG_SLOW_AI_MS: int = 5000  # Log AI requests slower than this

    # Legacy Anthropic (optional fallback)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # Calendar Integration (Google)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Calendar Integration (Outlook/Microsoft)
    OUTLOOK_CLIENT_ID: str = ""
    OUTLOOK_CLIENT_SECRET: str = ""

    # Database Pool
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
