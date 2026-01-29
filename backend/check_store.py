from config.database import Database
import asyncio

async def check():
    db_instance = Database()
    await db_instance.connect()
    db = db_instance.get_db()
    
    # Check store
    store = await db.stores.find_one({'slug': 'final-store-abc'})
    print('Store:', store)
    
    # Check tables count
    count = await db.tables.count_documents({'store_id': store['id']})
    print(f'Table count: {count}')
    
    await db_instance.close()

asyncio.run(check())
