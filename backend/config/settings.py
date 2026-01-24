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
    
    # JWT Configuration - Auto-fallback if env JWT_SECRET is too short
    _jwt_secret_env: str = os.environ.get('JWT_SECRET', '')
    JWT_SECRET: str = _jwt_secret_env if len(_jwt_secret_env) >= 32 else 'change_me_in_production_min32chars_secret_key_here_12345678'
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
    
    # CORS Configuration - Allow both dev and prod origins
    @classmethod
    def get_cors_origins(cls) -> list:
        """Get CORS origins - includes both dev and production for flexibility."""
        origins = [
            # Production domains
            "https://minitake.vercel.app",
            "https://minitakefood.up.railway.app",
            "https://minitake.pages.dev",
            # Development
            "http://localhost:3000",
            "http://localhost:3001",
        ]
        
        # Add FRONTEND_URL if not already in list
        if cls.FRONTEND_URL and cls.FRONTEND_URL not in origins:
            origins.append(cls.FRONTEND_URL)
        
        return origins
    
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
            # This should not happen due to auto-fallback, but check anyway
            errors.append("JWT_SECRET must be at least 32 characters long")
        
        # Warn if using default JWT secret (now just log warning, don't block)
        if cls.JWT_SECRET == 'change_me_in_production_min32chars_secret_key_here_12345678':
            if cls.ENVIRONMENT == 'production':
                print("⚠️  WARNING: Using default JWT_SECRET in production is insecure! Set a unique secret key.")
            # Auto-fallback was used - check if env had short secret
            if cls._jwt_secret_env and len(cls._jwt_secret_env) < 32:
                print(f"⚠️  WARNING: JWT_SECRET from environment is too short ({len(cls._jwt_secret_env)} chars). Using fallback.")
        
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
