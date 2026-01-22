"""Database connection and utilities."""
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from typing import Optional
import logging
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
            # Use certifi for SSL certificate verification (fixes SSL issues on cloud platforms)
            cls.client = AsyncIOMotorClient(
                settings.MONGO_URL,
                tlsCAFile=certifi.where()
            )
            # Test connection
            await cls.client.admin.command('ping')
            logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
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
