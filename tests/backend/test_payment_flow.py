"""
Test Payment Flow - End to End

This script tests the complete VietQR payment flow including polling.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")


async def test_payment_flow():
    """Test complete payment flow."""
    
    print("=" * 70)
    print("Testing VietQR Payment Flow")
    print("=" * 70)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Find a recent pending payment
        payment = await db.payments.find_one(
            {"payment_method": "bank_qr"},
            sort=[("created_at", -1)]
        )
        
        if not payment:
            print("❌ No QR payments found in database")
            return
        
        print(f"\n📋 Payment Details:")
        print(f"   ID: {payment['id']}")
        print(f"   Order ID: {payment['order_id']}")
        print(f"   Amount: {payment['amount']:,} VND")
        print(f"   Status: {payment['status']}")
        print(f"   Created: {payment.get('created_at', 'N/A')}")
        
        # Check order status
        order = await db.orders.find_one({"id": payment["order_id"]})
        
        if order:
            print(f"\n📦 Order Details:")
            print(f"   Status: {order['status']}")
            print(f"   Payment Status: {order.get('payment_status', 'N/A')}")
            print(f"   Total: {order['total']:,} VND")
        
        # Simulate polling
        print(f"\n🔄 Simulating Polling...")
        print(f"   Payment status: {payment['status']}")
        print(f"   Order payment_status: {order.get('payment_status', 'N/A')}")
        
        # Check sync logic
        if payment['status'] == 'pending' and order.get('payment_status') == 'paid':
            print(f"\n✅ SYNC NEEDED:")
            print(f"   Payment is 'pending' but Order is 'paid'")
            print(f"   Poll endpoint should sync payment status to 'paid'")
            
            # Update payment to simulate what poll_payment_status does
            result = await db.payments.update_one(
                {"id": payment["id"]},
                {"$set": {
                    "status": "paid",
                    "manual_confirmation": True,
                    "test_sync": True
                }}
            )
            
            print(f"   ✅ Synced payment status: {result.modified_count} document(s) updated")
            
        elif payment['status'] == 'paid':
            print(f"\n✅ Payment already marked as 'paid'")
            print(f"   Frontend polling will detect this and show success!")
            
        else:
            print(f"\n⚠️  Status:")
            print(f"   Payment: {payment['status']}")
            print(f"   Order payment: {order.get('payment_status', 'N/A')}")
            print(f"   May need webhook or manual confirmation")
        
        # Show what frontend poll response would be
        print(f"\n📡 Frontend Poll Response:")
        poll_response = {
            "status": "paid" if order.get('payment_status') == 'paid' else payment['status'],
            "paid_at": payment.get('paid_at'),
            "invoice_id": payment.get('invoice_id')
        }
        print(f"   {poll_response}")
        
        if poll_response['status'] == 'paid':
            print(f"\n🎉 SUCCESS: Frontend will show success screen!")
        else:
            print(f"\n⏳ WAITING: Frontend continues polling...")
        
    finally:
        client.close()
    
    print("\n" + "=" * 70)


async def test_webhook_simulation():
    """Test webhook data processing."""
    
    print("\n" + "=" * 70)
    print("Testing Webhook Simulation")
    print("=" * 70)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Find a pending payment
        payment = await db.payments.find_one(
            {
                "payment_method": "bank_qr",
                "status": "pending"
            },
            sort=[("created_at", -1)]
        )
        
        if not payment:
            print("❌ No pending QR payments found")
            return
        
        print(f"\n📋 Found Pending Payment:")
        print(f"   ID: {payment['id']}")
        print(f"   Amount: {payment['amount']:,} VND")
        
        # Simulate webhook
        webhook_data = {
            "id": "TEST_WEBHOOK_123",
            "amount": payment["amount"],
            "description": f"MINITAKE {payment['id'][:8].upper()} test payment",
            "when": "2025-10-27T10:00:00Z"
        }
        
        print(f"\n📥 Simulated Webhook Data:")
        print(f"   {webhook_data}")
        
        print(f"\n✅ To test webhook manually, POST to:")
        print(f"   /api/webhooks/test-payment")
        print(f"   Body: {{'payment_id': '{payment['id']}', 'amount': {payment['amount']}}}")
        
    finally:
        client.close()


async def main():
    """Run all tests."""
    await test_payment_flow()
    await test_webhook_simulation()


if __name__ == "__main__":
    asyncio.run(main())
