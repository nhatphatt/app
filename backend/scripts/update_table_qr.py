"""Update all existing tables to use dynamic QR code URL."""
import asyncio
import sys

sys.path.insert(0, 'D:/Minitake/app/backend')

from config.database import Database


async def update_existing_tables():
    await Database.connect()
    db = Database.get_db()

    print("Updating existing table QR codes...")
    
    # Get all stores with slug
    stores = await db.stores.find({}, {"id": 1, "slug": 1, "name": 1}).to_list(1000)
    
    for store in stores:
        store_id = store.get('id')
        slug = store.get('slug', '')
        
        # Get tables for this store
        tables = await db.tables.find({"store_id": store_id}).to_list(1000)
        
        for table in tables:
            table_id = table.get('id')
            table_number = table.get('table_number')
            
            # Generate new QR code URL (using placeholder - in production this should be from request)
            # For now, we'll update to use store slug
            new_qr_url = f"/menu/{slug}?table={table_id}"
            
            # Update the table
            await db.tables.update_one(
                {"id": table_id},
                {"$set": {"qr_code_url": new_qr_url}}
            )
            
            print(f"  Updated: Table {table_number} -> {new_qr_url}")
    
    print(f"\nDone! Updated tables for {len(stores)} stores")
    
    await Database.close()


if __name__ == "__main__":
    asyncio.run(update_existing_tables())
