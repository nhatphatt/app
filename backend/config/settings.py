"""Application settings and configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    """Application settings."""
    
    # Environment
    ENVIRONMENT: str = os.environ.get('ENVIRONMENT', 'development')
    
    # MongoDB Configuration
    MONGO_URL: str = os.environ.get("MONGO_URL", "")
    DB_NAME: str = os.environ.get("DB_NAME", "")
    
    # JWT Configuration - REQUIRED, no default for security
    JWT_SECRET: str = os.environ.get('JWT_SECRET', '')
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
    
    # Security Configuration
    WEBHOOK_SECRET: str = os.environ.get('WEBHOOK_SECRET', '')
    
    # CORS Configuration - Strict in production
    @classmethod
    def get_cors_origins(cls) -> list:
        """Get CORS origins based on environment."""
        if cls.ENVIRONMENT == 'production':
            # Production: Only allow specific domains
            return [
                cls.FRONTEND_URL,
                "https://minitake.vercel.app",
                "https://minitakefood.up.railway.app",
            ]
        else:
            # Development: Allow localhost
            return [
                "http://localhost:3000",
                "http://localhost:3001",
                cls.FRONTEND_URL
            ]
    
    @classmethod
    def validate(cls) -> None:
        """Validate required settings."""
        errors = []
        
        # Check required database settings
        if not cls.MONGO_URL:
            errors.append("MONGO_URL is required")
        if not cls.DB_NAME:
            errors.append("DB_NAME is required")
        
        # Check JWT secret - CRITICAL for security
        if not cls.JWT_SECRET:
            errors.append(
                "JWT_SECRET is required for security. "
                "Generate a strong secret key using: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        elif len(cls.JWT_SECRET) < 32:
            errors.append("JWT_SECRET must be at least 32 characters long")
        
        # Check webhook secret in production
        if cls.ENVIRONMENT == 'production' and not cls.WEBHOOK_SECRET:
            errors.append("WEBHOOK_SECRET is required in production for webhook verification")
        
        if errors:
            raise ValueError(
                "Configuration validation failed:\n" + "\n".join(f"  - {err}" for err in errors)
            )


# Create settings instance
settings = Settings()

# Validate on import
settings.validate()
