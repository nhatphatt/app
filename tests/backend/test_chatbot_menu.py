"""
Test chatbot recommendation with actual menu data
"""
import os
import sys
import asyncio

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

# Set environment variables
os.environ['GEMINI_API_KEY'] = 'AIzaSyDzZbJn8z22U0QDhcJYsbMmU-ZFMjaYeRk'
os.environ['MONGO_URL'] = 'mongodb://mongo:szOUkzzUBhFyVylYDUyFyTPzoPQERUUc@maglev.proxy.rlwy.net:51481'
os.environ['DB_NAME'] = 'minitake_db'

from motor.motor_asyncio import AsyncIOMotorClient
from chatbot.response_generator import ResponseGenerator

async def test_recommendation():
    print("=" * 70)
    print("Testing Chatbot Recommendation with Menu Data")
    print("=" * 70)
    
    # Connect to MongoDB
    print("\n[1] Connecting to MongoDB...")
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    print("✓ Connected successfully")
    
    # Get a store
    print("\n[2] Getting store...")
    store = await db.stores.find_one({}, {"_id": 0})
    if not store:
        print("❌ No store found!")
        return
    print(f"✓ Store found: {store.get('name')} (ID: {store.get('id')})")
    
    # Get menu items
    print("\n[3] Getting menu items...")
    menu_items = await db.menu_items.find(
        {"store_id": store['id'], "is_available": True},
        {"_id": 0}
    ).limit(10).to_list(10)
    print(f"✓ Found {len(menu_items)} menu items:")
    for item in menu_items:
        print(f"   - {item.get('name')} ({int(item.get('price', 0)):,}đ)")
    
    # Initialize ResponseGenerator with AI
    print("\n[4] Initializing ResponseGenerator with AI...")
    response_gen = ResponseGenerator(db, use_ai=True)
    print("✓ Initialized successfully")
    
    # Test recommendation
    print("\n[5] Testing recommendation...")
    print("User message: 'Gợi ý món ăn cho tôi'")
    
    response = await response_gen.generate_response(
        intent="ask_recommendation",
        entities={},
        context={},
        store_id=store['id'],
        original_message="Gợi ý món ăn cho tôi",
        conversation_history=[]
    )
    
    print("\n" + "=" * 70)
    print("RESPONSE:")
    print("=" * 70)
    print(f"\nText: {response.get('text')}")
    
    if response.get('rich_content'):
        rich = response['rich_content']
        print(f"\nRich Content Type: {rich.get('type')}")
        print(f"Number of items in carousel: {len(rich.get('items', []))}")
        print("\nRecommended items:")
        for item in rich.get('items', []):
            print(f"   🍽️  {item.get('name')} - {int(item.get('price', 0)):,}đ")
    
    print("\n" + "=" * 70)
    print("✓ TEST COMPLETED!")
    print("=" * 70)
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(test_recommendation())
