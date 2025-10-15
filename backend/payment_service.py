# payment_service.py - Payment processing service for Minitake
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

class PaymentService:
    def __init__(self, db, store_id: str):
        self.db = db
        self.store_id = store_id

    async def initiate_payment(
        self,
        order_id: str,
        payment_method: str,
        customer_info: Dict = {}
    ) -> Dict:
        """Initialize payment process"""

        # 1. Get order details
        order = await self.db.orders.find_one({
            "id": order_id,
            "store_id": self.store_id
        })

        if not order:
            raise Exception("Order not found")

        if order.get("payment_status") == "paid":
            raise Exception("Order already paid")

        # 2. Create payment record
        payment_id = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        payment_doc = {
            "id": payment_id,
            "order_id": order_id,
            "store_id": self.store_id,
            "payment_method": payment_method,
            "amount": order["total"],
            "currency": "VND",
            "status": "pending",
            "initiated_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "webhook_received": False,
            "webhook_verified": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # 3. Handle specific payment method
        if payment_method == "cash":
            response = await self._handle_cash_payment(payment_doc, order)

        elif payment_method == "bank_qr":
            response = await self._handle_bank_qr_payment(payment_doc, order)
        else:
            raise Exception(f"Payment method {payment_method} not supported")

        # 4. Save payment
        await self.db.payments.insert_one(payment_doc)

        # 5. Update order status
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "payment_status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        return response

    async def _handle_cash_payment(self, payment_doc: Dict, order: Dict) -> Dict:
        """Handle cash payment - requires staff confirmation"""

        return {
            "payment_id": payment_doc["id"],
            "order_id": payment_doc["order_id"],
            "status": "pending",
            "amount": payment_doc["amount"],
            "payment_method": "cash",
            "requires_confirmation": True,
            "message": "Vui lòng thanh toán tiền mặt tại quầy. Nhân viên sẽ xác nhận thanh toán."
        }

    async def _handle_bank_qr_payment(self, payment_doc: Dict, order: Dict) -> Dict:
        """Generate VietQR code for bank transfer"""

        # Get bank config from payment_methods collection
        payment_method = await self.db.payment_methods.find_one({
            "store_id": self.store_id,
            "method_type": "bank_qr",
            "is_enabled": True
        })

        if not payment_method:
            raise Exception("Bank QR payment method not configured or disabled")

        bank_config = payment_method.get("config", {})

        # Validate required fields
        if not all([
            bank_config.get("bank_name"),
            bank_config.get("bank_bin"),
            bank_config.get("account_number"),
            bank_config.get("account_name")
        ]):
            raise Exception("Bank QR payment method not fully configured. Please configure in admin panel.")

        # Generate payment content (for matching)
        payment_content = f"MINITAKE {payment_doc['id'][:8].upper()}"

        # Generate QR image URL using VietQR API
        amount = int(payment_doc["amount"])
        qr_image_url = (
            f"https://img.vietqr.io/image/"
            f"{bank_config['bank_bin']}-{bank_config['account_number']}-compact2.jpg"
            f"?amount={amount}"
            f"&addInfo={payment_content}"
            f"&accountName={bank_config['account_name']}"
        )

        # Update payment doc
        payment_doc.update({
            "qr_code_url": qr_image_url,
            "gateway_response": {
                "bank_bin": bank_config["bank_bin"],
                "account_number": bank_config["account_number"],
                "account_name": bank_config["account_name"],
                "content": payment_content
            }
        })

        return {
            "payment_id": payment_doc["id"],
            "order_id": payment_doc["order_id"],
            "status": "pending",
            "amount": payment_doc["amount"],
            "payment_method": "bank_qr",
            "qr_code_url": qr_image_url,
            "expires_at": payment_doc["expires_at"],
            "bank_info": {
                "bank_name": bank_config["bank_name"],
                "account_number": bank_config["account_number"],
                "account_name": bank_config["account_name"],
                "content": payment_content
            },
            "message": "Quét mã QR bằng ứng dụng ngân hàng để thanh toán"
        }

    async def confirm_cash_payment(
        self,
        payment_id: str,
        staff_user_id: str,
        confirmation: Dict
    ) -> Dict:
        """Staff confirms cash payment"""

        payment = await self.db.payments.find_one({
            "id": payment_id,
            "store_id": self.store_id
        })

        if not payment:
            raise Exception("Payment not found")

        if payment["status"] != "pending":
            raise Exception("Payment already processed")

        # Update payment
        await self.db.payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "confirmed_by": staff_user_id,
                "confirmed_at": datetime.now(timezone.utc).isoformat(),
                "gateway_response": confirmation,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        # Update order and complete payment
        await self._complete_payment(payment_id, payment["order_id"])

        return {
            "payment_id": payment_id,
            "status": "paid",
            "confirmed_by": staff_user_id
        }

    async def poll_payment_status(self, payment_id: str) -> Dict:
        """Check payment status - for polling"""

        payment = await self.db.payments.find_one({"id": payment_id})

        if not payment:
            raise Exception("Payment not found")

        # Check if expired
        if payment["status"] == "pending":
            expires_at = datetime.fromisoformat(payment["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                # Mark as expired
                await self.db.payments.update_one(
                    {"id": payment_id},
                    {"$set": {"status": "expired"}}
                )
                payment["status"] = "expired"

        return {
            "status": payment["status"],
            "paid_at": payment.get("paid_at"),
            "invoice_id": payment.get("invoice_id")
        }

    async def _complete_payment(self, payment_id: str, order_id: str):
        """Complete payment and update order status"""

        # 1. Update order
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "payment_status": "paid",
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        # 2. Get order to find table
        order = await self.db.orders.find_one({"id": order_id})

        # 3. Update table status if table exists
        if order.get("table_id"):
            await self.db.tables.update_one(
                {"id": order["table_id"]},
                {"$set": {
                    "status": "available",
                    "current_order_id": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
