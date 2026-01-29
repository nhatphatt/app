from config.database import Database
from config.settings import settings
import asyncio

async def check():
    db_instance = Database()
    await db_instance.connect()
    db = db_instance.get_db()

    # Check user
    users = await db.users.find({'email': 'newtest@test.com'}).to_list(1)
    print('Users:', users)
    if users:
        store_id = users[0].get('store_id')
        print('User store_id:', store_id)

    # Check store by ID
    if users:
        store_id = users[0].get('store_id')
        store = await db.stores.find_one({'id': store_id})
        print('Store by ID:', store)

    # Check subscription
    if users:
        store_id = users[0].get('store_id')
        subscription = await db.subscriptions.find_one({'store_id': store_id})
        print('Subscription:', subscription)

    await db_instance.close()

asyncio.run(check())
