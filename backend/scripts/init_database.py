"""Database initialization script.

Run this script to:
1. Create all database indexes
2. Verify database connection
3. Display database statistics

Usage:
    python scripts/init_database.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.database import Database
from config.indexes import initialize_indexes
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def get_collection_stats(db):
    """Get statistics for all collections."""
    collections = await db.list_collection_names()
    
    print("\n" + "="*60)
    print("📊 DATABASE STATISTICS")
    print("="*60)
    
    for collection_name in sorted(collections):
        collection = db[collection_name]
        count = await collection.count_documents({})
        indexes = await collection.list_indexes().to_list(None)
        
        print(f"\n{collection_name}:")
        print(f"  Documents: {count:,}")
        print(f"  Indexes: {len(indexes)}")
        
        if indexes:
            print(f"  Index details:")
            for idx in indexes:
                name = idx.get('name', 'unknown')
                keys = idx.get('key', {})
                unique = ' (unique)' if idx.get('unique') else ''
                print(f"    - {name}: {dict(keys)}{unique}")


async def verify_indexes(db):
    """Verify that all indexes were created successfully."""
    print("\n" + "="*60)
    print("✅ VERIFYING INDEXES")
    print("="*60)
    
    collections = {
        'users': ['email_unique', 'id_unique', 'store_id_idx', 'store_role_idx'],
        'stores': ['slug_unique', 'id_unique', 'created_at_idx'],
        'categories': ['id_unique', 'store_display_idx', 'store_id_idx'],
        'menu_items': ['id_unique', 'store_category_idx', 'store_id_idx', 'category_id_idx', 'search_text_idx'],
        'orders': ['id_unique', 'store_created_idx', 'store_status_created_idx', 'table_id_idx', 'store_payment_status_idx', 'created_at_idx'],
        'payments': ['id_unique', 'order_id_idx', 'store_created_idx', 'store_status_idx', 'payment_method_idx'],
        'tables': ['id_unique', 'store_table_idx', 'store_status_idx'],
        'promotions': ['id_unique', 'store_active_dates_idx', 'store_id_idx'],
        'payment_methods': ['id_unique', 'store_enabled_idx', 'store_method_unique'],
    }
    
    all_verified = True
    
    for collection_name, expected_indexes in collections.items():
        collection = db[collection_name]
        indexes = await collection.list_indexes().to_list(None)
        index_names = [idx['name'] for idx in indexes]
        
        missing = [idx for idx in expected_indexes if idx not in index_names]
        
        if missing:
            print(f"❌ {collection_name}: Missing indexes: {missing}")
            all_verified = False
        else:
            print(f"✅ {collection_name}: All {len(expected_indexes)} indexes verified")
    
    return all_verified


async def main():
    """Main initialization function."""
    print("\n" + "="*60)
    print("🚀 MINITAKE DATABASE INITIALIZATION")
    print("="*60)
    
    # Initialize database connection
    db_instance = Database()
    
    try:
        # Connect to database
        print("\n📡 Connecting to database...")
        await db_instance.connect()
        db = db_instance.get_db()
        print("✅ Database connected successfully")
        
        # Create indexes
        print("\n🔧 Creating database indexes...")
        await initialize_indexes(db)
        print("✅ All indexes created")
        
        # Verify indexes
        indexes_verified = await verify_indexes(db)
        
        # Display statistics
        await get_collection_stats(db)
        
        # Final summary
        print("\n" + "="*60)
        if indexes_verified:
            print("✅ DATABASE INITIALIZATION COMPLETE")
            print("="*60)
            print("\n✅ All indexes created and verified successfully!")
            print("✅ Database is optimized and ready for production")
        else:
            print("⚠️ DATABASE INITIALIZATION COMPLETE WITH WARNINGS")
            print("="*60)
            print("\n⚠️ Some indexes may be missing. Please check the logs above.")
        
        return 0 if indexes_verified else 1
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        logger.exception("Database initialization failed")
        return 1
        
    finally:
        # Close database connection
        await db_instance.close()
        print("\n📡 Database connection closed")


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
