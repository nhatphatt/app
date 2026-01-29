"""PayOS Payment Service for Minitake F&B system.

Handles payment link creation, verification, and webhook processing.
"""

import uuid
import hashlib
import hmac
import time
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import logging

from config.settings import settings

logger = logging.getLogger(__name__)


class PayOSService:
    """Service for PayOS payment integration."""

    PAYOS_API_URL = "https://api.payos.vn"

    def __init__(self):
        self.client_id = settings.PAYOS_CLIENT_ID
        self.api_key = settings.PAYOS_API_KEY
        self.checksum_key = settings.PAYOS_CHECKSUM_KEY

    def is_mock_mode(self) -> bool:
        """Check if running in mock mode."""
        return settings.MOCK_PAYOS_ENABLED

    def _generate_order_code(self, prefix: str = "sub") -> str:
        """Generate unique order code."""
        timestamp = int(time.time() * 1000)
        return f"{prefix}_{timestamp}"

    def _sign_data(self, data: Dict[str, Any]) -> str:
        """Create HMAC-SHA256 signature for data."""
        # Sort keys alphabetically and create sign string
        sign_str = "&".join(
            f"{key}={data[key]}"
            for key in sorted(data.keys())
            if data[key] is not None
        )
        signature = hmac.new(
            self.checksum_key.encode('utf-8'),
            sign_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature

    def _get_current_time_millis(self) -> int:
        """Get current time in milliseconds."""
        return int(time.time() * 1000)

    async def create_payment_link(
        self,
        order_code: str,
        amount: int,
        description: str,
        buyer_name: str,
        buyer_email: str,
        buyer_phone: str,
        return_url: str,
        cancel_url: str,
        items: Optional[list] = None
    ) -> Dict[str, Any]:
        """Create a PayOS payment link.

        Args:
            order_code: Unique order code (e.g., "sub_PRO_1701234567890")
            amount: Amount in VND (including VAT)
            description: Payment description
            buyer_name: Customer name
            buyer_email: Customer email
            buyer_phone: Customer phone
            return_url: URL to redirect after payment
            cancel_url: URL to redirect after cancellation
            items: List of items being purchased

        Returns:
            Dict with payment link details or error
        """
        # MOCK MODE: Return mock payment link for development
        if settings.MOCK_PAYOS_ENABLED:
            logger.info(f"MOCK MODE: Creating mock payment link for order {order_code}")
            mock_payment_id = f"mock_{uuid.uuid4().hex[:8]}"
            return {
                "success": True,
                "order_code": order_code,
                "payment_link_id": mock_payment_id,
                "checkout_url": f"{settings.MOCK_CHECKOUT_URL}&order_code={order_code}&mock=true",
                "qr_code_url": None,
                "is_mock": True
            }

        if items is None:
            items = [
                {
                    "name": description,
                    "quantity": 1,
                    "price": amount
                }
            ]

        # Prepare request data
        data = {
            "orderCode": order_code,
            "amount": amount,
            "description": description,
            "buyerName": buyer_name,
            "buyerEmail": buyer_email,
            "buyerPhone": buyer_phone,
            "items": items,
            "returnUrl": return_url,
            "cancelUrl": cancel_url,
            "expiredAt": self._get_current_time_millis() + (15 * 60 * 1000),  # 15 minutes
        }

        # Generate signature
        data["signature"] = self._sign_data(data)

        # Make API request
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.PAYOS_API_URL}/payment-requests",
                    headers={
                        "x-client-id": self.client_id,
                        "x-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json=data
                )

                result = response.json()

                if result.get("code") == "00":
                    logger.info(f"PayOS payment link created: {order_code}")
                    return {
                        "success": True,
                        "order_code": order_code,
                        "payment_link_id": result["data"].get("id"),
                        "checkout_url": result["data"].get("checkoutUrl"),
                        "qr_code_url": result["data"].get("qrCode")
                    }
                else:
                    logger.error(f"PayOS error: {result.get('message')}")
                    return {
                        "success": False,
                        "error": result.get("message", "Failed to create payment link")
                    }

        except httpx.RequestError as e:
            logger.error(f"PayOS request error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_payment_info(self, payment_link_id: str) -> Dict[str, Any]:
        """Get payment information from PayOS.

        Args:
            payment_link_id: PayOS payment link ID

        Returns:
            Dict with payment details
        """
        # MOCK MODE: Return mock payment info
        if settings.MOCK_PAYOS_ENABLED:
            logger.info(f"MOCK MODE: Getting mock payment info for {payment_link_id}")
            return {
                "success": True,
                "status": "PAID",
                "order_code": payment_link_id,
                "amount": 218900,
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "transaction_id": f"mock_txn_{uuid.uuid4().hex[:8]}",
                "is_mock": True
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.PAYOS_API_URL}/payment-requests/{payment_link_id}",
                    headers={
                        "x-client-id": self.client_id,
                        "x-api-key": self.api_key
                    }
                )

                result = response.json()

                if result.get("code") == "00":
                    data = result["data"]
                    return {
                        "success": True,
                        "status": data.get("status"),
                        "order_code": data.get("orderCode"),
                        "amount": data.get("amount"),
                        "paid_at": data.get("paidAt"),
                        "transaction_id": data.get("transactionId")
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Failed to get payment info")
                    }

        except httpx.RequestError as e:
            logger.error(f"PayOS request error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def verify_webhook_signature(
        self,
        data: Dict[str, Any],
        signature: str
    ) -> bool:
        """Verify PayOS webhook signature.

        Args:
            data: Webhook data
            signature: Signature from PayOS header

        Returns:
            True if signature is valid
        """
        # MOCK MODE: Always return True
        if settings.MOCK_PAYOS_ENABLED:
            logger.info("MOCK MODE: Skipping webhook signature verification")
            return True

        expected_signature = self._sign_data(data)
        return hmac.compare_digest(expected_signature, signature)

    async def cancel_payment_link(
        self,
        payment_link_id: str
    ) -> Dict[str, Any]:
        """Cancel a payment link.

        Args:
            payment_link_id: PayOS payment link ID

        Returns:
            Dict with cancellation result
        """
        # MOCK MODE: Return mock cancellation
        if settings.MOCK_PAYOS_ENABLED:
            logger.info(f"MOCK MODE: Cancelling mock payment link {payment_link_id}")
            return {
                "success": True,
                "message": "Payment link cancelled (mock mode)"
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.PAYOS_API_URL}/payment-requests/{payment_link_id}",
                    headers={
                        "x-client-id": self.client_id,
                        "x-api-key": self.api_key
                    }
                )

                result = response.json()

                if result.get("code") == "00":
                    return {
                        "success": True,
                        "message": "Payment link cancelled"
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("message", "Failed to cancel payment link")
                    }

        except httpx.RequestError as e:
            logger.error(f"PayOS request error: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Create service instance
payos_service = PayOSService()
