from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # =========================
    # App
    # =========================
    app_name: str = "RAG Education System"
    app_version: str = "1.0.0"

    # =========================
    # Database
    # =========================
    database_url: str
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # =========================
    # JWT
    # =========================
    secret_key: str = "your-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # =========================
    # OpenAI
    # =========================
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # =========================
    # Ollama
    # =========================
    ollama_model: str = "llama3.2:3b"
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 600

    # =========================
    # RAG
    # =========================
    embedding_model_name: str = "BAAI/bge-m3"
    chroma_data_dir: str = "chroma_data"
    rag_min_score: float = 0.40
    rag_top_k: int = 5
    max_conversation_history: int = 6

    # =========================
    # Upload
    # =========================
    upload_dir: str = "uploads"

    # =========================
    # CORS
    # =========================
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()