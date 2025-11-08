"""Database indexes configuration and creation.

This module defines and creates all necessary MongoDB indexes for optimal query performance.
Run this script during deployment or database setup.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class DatabaseIndexes:
    """Manages MongoDB indexes for all collections."""
    
    @staticmethod
    async def create_all_indexes(db: AsyncIOMotorDatabase) -> Dict[str, List[str]]:
        """
        Create all database indexes.
        
        Args:
            db: MongoDB database instance
            
        Returns:
            Dictionary with collection names and created index names
        """
        results = {}
        
        try:
            # Users collection indexes
            results['users'] = await DatabaseIndexes._create_user_indexes(db)
            
            # Stores collection indexes
            results['stores'] = await DatabaseIndexes._create_store_indexes(db)
            
            # Categories collection indexes
            results['categories'] = await DatabaseIndexes._create_category_indexes(db)
            
            # Menu items collection indexes
            results['menu_items'] = await DatabaseIndexes._create_menu_item_indexes(db)
            
            # Orders collection indexes
            results['orders'] = await DatabaseIndexes._create_order_indexes(db)
            
            # Payments collection indexes
            results['payments'] = await DatabaseIndexes._create_payment_indexes(db)
            
            # Tables collection indexes
            results['tables'] = await DatabaseIndexes._create_table_indexes(db)
            
            # Promotions collection indexes
            results['promotions'] = await DatabaseIndexes._create_promotion_indexes(db)
            
            # Payment methods collection indexes
            results['payment_methods'] = await DatabaseIndexes._create_payment_method_indexes(db)
            
            logger.info("✅ All database indexes created successfully")
            return results
            
        except Exception as e:
            logger.error(f"❌ Error creating indexes: {str(e)}")
            raise
    
    @staticmethod
    async def _create_user_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for users collection."""
        collection = db.users
        created = []
        
        # Unique index on email for fast login lookups and prevent duplicates
        await collection.create_index("email", unique=True, name="email_unique")
        created.append("email_unique")
        
        # Index on id for fast user lookups
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Index on store_id for querying all users of a store
        await collection.create_index("store_id", name="store_id_idx")
        created.append("store_id_idx")
        
        # Compound index for role-based queries within a store
        await collection.create_index(
            [("store_id", 1), ("role", 1)],
            name="store_role_idx"
        )
        created.append("store_role_idx")
        
        logger.info(f"Created {len(created)} indexes for users collection")
        return created
    
    @staticmethod
    async def _create_store_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for stores collection."""
        collection = db.stores
        created = []
        
        # Unique index on slug for public menu access
        await collection.create_index("slug", unique=True, name="slug_unique")
        created.append("slug_unique")
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Index on created_at for sorting/filtering
        await collection.create_index("created_at", name="created_at_idx")
        created.append("created_at_idx")
        
        logger.info(f"Created {len(created)} indexes for stores collection")
        return created
    
    @staticmethod
    async def _create_category_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for categories collection."""
        collection = db.categories
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Compound index on store_id and display_order for menu display
        await collection.create_index(
            [("store_id", 1), ("display_order", 1)],
            name="store_display_idx"
        )
        created.append("store_display_idx")
        
        # Index on store_id for filtering categories by store
        await collection.create_index("store_id", name="store_id_idx")
        created.append("store_id_idx")
        
        logger.info(f"Created {len(created)} indexes for categories collection")
        return created
    
    @staticmethod
    async def _create_menu_item_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for menu_items collection."""
        collection = db.menu_items
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Compound index for menu queries (most common query pattern)
        await collection.create_index(
            [("store_id", 1), ("category_id", 1)],
            name="store_category_idx"
        )
        created.append("store_category_idx")
        
        # Index on store_id for all items in a store
        await collection.create_index("store_id", name="store_id_idx")
        created.append("store_id_idx")
        
        # Index on category_id for category-specific queries
        await collection.create_index("category_id", name="category_id_idx")
        created.append("category_id_idx")
        
        # Text index for search functionality
        await collection.create_index(
            [("name", "text"), ("description", "text")],
            name="search_text_idx"
        )
        created.append("search_text_idx")
        
        logger.info(f"Created {len(created)} indexes for menu_items collection")
        return created
    
    @staticmethod
    async def _create_order_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for orders collection."""
        collection = db.orders
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Compound index for store orders (most common query)
        # Sort by created_at descending (newest first)
        await collection.create_index(
            [("store_id", 1), ("created_at", -1)],
            name="store_created_idx"
        )
        created.append("store_created_idx")
        
        # Compound index for status queries
        await collection.create_index(
            [("store_id", 1), ("status", 1), ("created_at", -1)],
            name="store_status_created_idx"
        )
        created.append("store_status_created_idx")
        
        # Index on table_id for table-specific orders
        await collection.create_index("table_id", name="table_id_idx")
        created.append("table_id_idx")
        
        # Index on payment_status for payment queries
        await collection.create_index(
            [("store_id", 1), ("payment_status", 1)],
            name="store_payment_status_idx"
        )
        created.append("store_payment_status_idx")
        
        # Index on created_at for analytics/reports
        await collection.create_index("created_at", name="created_at_idx")
        created.append("created_at_idx")
        
        logger.info(f"Created {len(created)} indexes for orders collection")
        return created
    
    @staticmethod
    async def _create_payment_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for payments collection."""
        collection = db.payments
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Index on order_id for payment lookup by order
        await collection.create_index("order_id", name="order_id_idx")
        created.append("order_id_idx")
        
        # Compound index for store payments
        await collection.create_index(
            [("store_id", 1), ("created_at", -1)],
            name="store_created_idx"
        )
        created.append("store_created_idx")
        
        # Index on status for filtering pending/paid payments
        await collection.create_index(
            [("store_id", 1), ("status", 1)],
            name="store_status_idx"
        )
        created.append("store_status_idx")
        
        # Index on payment_method for analytics
        await collection.create_index("payment_method", name="payment_method_idx")
        created.append("payment_method_idx")
        
        logger.info(f"Created {len(created)} indexes for payments collection")
        return created
    
    @staticmethod
    async def _create_table_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for tables collection."""
        collection = db.tables
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Compound index for store tables
        await collection.create_index(
            [("store_id", 1), ("table_number", 1)],
            name="store_table_idx"
        )
        created.append("store_table_idx")
        
        # Index on status for available table queries
        await collection.create_index(
            [("store_id", 1), ("status", 1)],
            name="store_status_idx"
        )
        created.append("store_status_idx")
        
        logger.info(f"Created {len(created)} indexes for tables collection")
        return created
    
    @staticmethod
    async def _create_promotion_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for promotions collection."""
        collection = db.promotions
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Compound index for active promotions (most common query)
        await collection.create_index(
            [("store_id", 1), ("is_active", 1), ("start_date", 1), ("end_date", 1)],
            name="store_active_dates_idx"
        )
        created.append("store_active_dates_idx")
        
        # Index on store_id
        await collection.create_index("store_id", name="store_id_idx")
        created.append("store_id_idx")
        
        logger.info(f"Created {len(created)} indexes for promotions collection")
        return created
    
    @staticmethod
    async def _create_payment_method_indexes(db: AsyncIOMotorDatabase) -> List[str]:
        """Create indexes for payment_methods collection."""
        collection = db.payment_methods
        created = []
        
        # Index on id
        await collection.create_index("id", unique=True, name="id_unique")
        created.append("id_unique")
        
        # Compound index for enabled payment methods
        await collection.create_index(
            [("store_id", 1), ("is_enabled", 1)],
            name="store_enabled_idx"
        )
        created.append("store_enabled_idx")
        
        # Unique compound index to prevent duplicate method types per store
        await collection.create_index(
            [("store_id", 1), ("method_type", 1)],
            unique=True,
            name="store_method_unique"
        )
        created.append("store_method_unique")
        
        logger.info(f"Created {len(created)} indexes for payment_methods collection")
        return created


async def initialize_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Initialize all database indexes.
    
    This function should be called during application startup or deployment.
    
    Args:
        db: MongoDB database instance
    """
    logger.info("🔧 Initializing database indexes...")
    results = await DatabaseIndexes.create_all_indexes(db)
    
    total_indexes = sum(len(indexes) for indexes in results.values())
    logger.info(f"✅ Created {total_indexes} indexes across {len(results)} collections")
    
    for collection, indexes in results.items():
        logger.info(f"  {collection}: {len(indexes)} indexes")
