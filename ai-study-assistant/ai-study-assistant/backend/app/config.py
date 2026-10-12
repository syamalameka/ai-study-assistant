import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    def __init__(self):
        self.APP_NAME: str = "AI Study Assistant"
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
        self.MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.DATABASE_NAME: str = os.getenv("DATABASE_NAME", "ai_study_assistant")
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
        self.CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
        self.CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))
        self.UPLOAD_DIR: Path = BASE_DIR / "uploads"
        self.SAMPLE_DIR: Path = BASE_DIR / "sample_data"
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

    def update_gemini_key(self, new_key: str):
        self.GEMINI_API_KEY = new_key.strip()
        os.environ["GEMINI_API_KEY"] = self.GEMINI_API_KEY
        # Also update .env file
        env_path = BASE_DIR / ".env"
        try:
            if env_path.exists():
                content = env_path.read_text(encoding="utf-8")
                lines = content.splitlines()
                updated = False
                new_lines = []
                for line in lines:
                    if line.startswith("GEMINI_API_KEY="):
                        new_lines.append(f"GEMINI_API_KEY={self.GEMINI_API_KEY}")
                        updated = True
                    else:
                        new_lines.append(line)
                if not updated:
                    new_lines.append(f"GEMINI_API_KEY={self.GEMINI_API_KEY}")
                env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        except Exception:
            pass

settings = Settings()
