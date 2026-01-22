"""Database connection and utilities."""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from typing import Optional
import logging
import ssl
import certifi

from config.settings import settings

logger = logging.getLogger(__name__)


class Database:
    """MongoDB database connection manager."""
    
    client: Optional[AsyncIOMotorClient] = None
    
    @classmethod
    async def connect(cls) -> None:
        """Connect to MongoDB."""
        try:
            # Try with certifi SSL certificates first
            cls.client = AsyncIOMotorClient(
                settings.MONGO_URL,
                tls=True,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=30000
            )
            # Test connection
            await cls.client.admin.command('ping')
            logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.warning(f"SSL connection failed with certifi, trying with tlsAllowInvalidCertificates: {e}")
            try:
                # Fallback: Allow invalid certificates (less secure but works on some cloud platforms)
                cls.client = AsyncIOMotorClient(
                    settings.MONGO_URL,
                    tls=True,
                    tlsAllowInvalidCertificates=True,
                    serverSelectionTimeoutMS=30000
                )
                await cls.client.admin.command('ping')
                logger.info(f"Connected to MongoDB (with tlsAllowInvalidCertificates): {settings.DB_NAME}")
            except Exception as fallback_error:
                logger.error(f"Failed to connect to MongoDB: {fallback_error}")
                raise
    
    @classmethod
    async def close(cls) -> None:
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
            logger.info("Closed MongoDB connection")
    
    @classmethod
    def get_db(cls):
        """Get database instance."""
        if not cls.client:
            raise RuntimeError("Database not connected. Call connect() first.")
        return cls.client[settings.DB_NAME]


# Create database instance
db = Database()
