"""Application settings and configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    """Application settings."""
    
    # MongoDB Configuration
    MONGO_URL: str = os.environ.get("MONGO_URL", "")
    DB_NAME: str = os.environ.get("DB_NAME", "")
    
    # JWT Configuration
    JWT_SECRET: str = os.environ.get('JWT_SECRET', 'minitake-secret-key-change-in-production')
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Frontend Configuration
    FRONTEND_URL: str = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    
    # API Configuration
    API_TITLE: str = "Minitake API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "API cho hệ thống quản lý nhà hàng thông minh"
    
    # Gemini AI Configuration
    GEMINI_API_KEY: str = os.environ.get('GEMINI_API_KEY', '')
    
    # CORS Configuration
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://minitake.vercel.app",
        FRONTEND_URL
    ]
    
    @classmethod
    def validate(cls) -> None:
        """Validate required settings."""
        if not cls.MONGO_URL or not cls.DB_NAME:
            raise ValueError(
                "Missing required environment variables. "
                "Please set MONGO_URL and DB_NAME in your .env file."
            )


# Create settings instance
settings = Settings()

# Validate on import
settings.validate()
