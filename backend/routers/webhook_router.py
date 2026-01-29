"""Webhook Router for Minitake F&B system.

Handles webhooks from external services like PayOS.
"""

from fastapi import APIRouter, Request, HTTPException, Header, status
from typing import Optional
from datetime import datetime, timezone
import hashlib
import hmac
import logging
import json

from config.settings import settings
from config.database import Database
from services.subscription_service import subscription_service
from payment_service import PaymentService

api_router = APIRouter(prefix="/api/webhooks")


def verify_payos_signature(payload: str, signature: str) -> bool:
    """Verify PayOS webhook signature.
    
    Args:
        payload: Raw request body as string
        signature: Signature from PayOS header
    
    Returns:
        True if signature is valid
    """
    if not settings.PAYOS_CHECKSUM_KEY:
        logging.warning("PayOS checksum key not configured")
        return False
    
    expected_signature = hmac.new(
        settings.PAYOS_CHECKSUM_KEY.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


@api_router.post("/payos")
async def payos_webhook(
    request: Request,
    x_payos_signature: Optional[str] = Header(None),
    x_payos_client_id: Optional[str] = Header(None)
):
    """Handle PayOS webhook callback.
    
    PayOS will call this endpoint after payment status changes.
    
    Args:
        request: FastAPI request object
        x_payos_signature: PayOS signature header
        x_payos_client_id: PayOS client ID header
    
    Returns:
        Response indicating webhook was processed.
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        payload_str = body.decode('utf-8')
        
        logging.info(f"Received PayOS webhook: {payload_str}")
        
        # Verify signature if provided
        if x_payos_signature and settings.PAYOS_CHECKSUM_KEY:
            if not verify_payos_signature(payload_str, x_payos_signature):
                logging.warning("Invalid PayOS signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid signature"
                )
        
        # Parse payload
        try:
            payload = json.loads(payload_str)
        except json.JSONDecodeError:
            logging.error("Invalid JSON in webhook payload")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON"
            )
        
        # Extract payment info
        code = payload.get("code")
        data = payload.get("data", {})
        
        # PayOS returns code "00" for success
        if code != "00":
            logging.warning(f"PayOS webhook error code: {code}")
            return {"code": code, "message": payload.get("desc", "Error")}
        
        order_code = data.get("orderCode")
        amount = data.get("amount")
        status_ = data.get("status")
        transaction_id = data.get("transactionId")
        
        logging.info(f"PayOS payment: order={order_code}, amount={amount}, status={status_}")
        
        # Only process PAID status
        if status_ != "PAID":
            logging.info(f"Ignoring non-paid status: {status_}")
            return {"code": "00", "message": "Status ignored"}
        
        # Initialize database
        db = Database.get_db()
        await subscription_service.init_db(db)
        
        # Check if this is a subscription payment or order payment
        # First check subscription payments
        payment = await db.subscription_payments.find_one({
            "payos_order_id": order_code
        })
        
        if payment:
            # Process subscription payment
            logging.info(f"Processing subscription payment: {payment['payment_id']}")
            
            if payment.get("status") == "paid":
                logging.info(f"Payment already processed: {payment['payment_id']}")
                return {"code": "00", "message": "Already processed"}
            
            payos_data = {
                "orderCode": order_code,
                "amount": amount,
                "status": status_,
                "transactionId": transaction_id
            }
            
            result = await subscription_service.process_payment_success(
                payment_id=payment["payment_id"],
                payos_data=payos_data
            )

            # If this is a new registration payment, mark pending_registration as paid
            pending_reg_id = payment.get("pending_registration_id")
            if pending_reg_id:
                await db.pending_registrations.update_one(
                    {"pending_id": pending_reg_id},
                    {"$set": {
                        "status": "payment_completed",
                        "payment_completed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logging.info(f"Marked pending registration as paid: {pending_reg_id}")
            
            if result.get("success"):
                logging.info(f"Subscription payment processed: {payment['payment_id']}")
                return {"code": "00", "message": "OK"}
            else:
                logging.error(f"Failed to process subscription payment: {result.get('error')}")
                return {"code": "02", "message": "Processing failed"}
        
        # Check if this is an order payment
        order_payment = await db.payments.find_one({
            "payos_order_id": order_code,
            "payment_method": "payos"
        })
        
        if order_payment:
            # Process order payment
            logging.info(f"Processing order payment: {order_payment['id']}")
            
            payment_service = PaymentService(db, order_payment["store_id"])
            result = await payment_service.process_payos_webhook(payload)
            
            logging.info(f"Order payment result: {result}")
            return {"code": "00", "message": "OK"}
        
        logging.warning(f"Payment not found for order: {order_code}")
        return {"code": "01", "message": "Payment not found"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"PayOS webhook error: {e}")
        # Still return 200 to prevent PayOS retry
        return {"code": "03", "message": "Internal error"}


@api_router.get("/payos/health")
async def payos_webhook_health():
    """Health check endpoint for PayOS webhook."""
    return {"status": "healthy", "service": "webhook"}
