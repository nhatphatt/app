"""Email Service using Resend for Minitake F&B system.

Handles all email notifications for subscription management.
"""

import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import logging

from config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Resend."""

    RESEND_API_URL = "https://api.resend.com"

    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM_EMAIL

    async def _send_email(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via Resend API.

        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML content
            text: Plain text content (optional)

        Returns:
            Dict with result
        """
        if not self.api_key or self.api_key.startswith("re_123456789"):
            logger.warning("Resend API key not configured. Email not sent.")
            return {
                "success": False,
                "error": "Email service not configured"
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "from": self.from_email,
                    "to": to if isinstance(to, list) else [to],
                    "subject": subject,
                    "html": html,
                }
                if text:
                    payload["text"] = text

                response = await client.post(
                    f"{self.RESEND_API_URL}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )

                if response.status_code in [200, 201]:
                    result = response.json()
                    logger.info(f"Email sent to {to}: {result.get('id')}")
                    return {
                        "success": True,
                        "email_id": result.get("id")
                    }
                else:
                    error_data = response.json()
                    logger.error(f"Resend error: {error_data}")
                    return {
                        "success": False,
                        "error": error_data.get("message", "Failed to send email")
                    }

        except httpx.RequestError as e:
            logger.error(f"Resend request error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _format_currency(self, amount: int) -> str:
        """Format amount as VND currency."""
        return f"{amount:,} VND"

    async def send_trial_activation_email(
        self,
        to: str,
        store_name: str,
        trial_end_date: str
    ) -> Dict[str, Any]:
        """Send email confirming trial activation.

        Args:
            to: Store owner email
            store_name: Name of the store
            trial_end_date: Date when trial ends
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .feature-list {{ list-style: none; padding: 0; }}
                .feature-list li {{ padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
                .feature-list li:last-child {{ border-bottom: none; }}
                .cta-button {{ display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Chào mừng bạn đến với Minitake PRO!</h1>
                    <p>14 ngày dùng thử MIỄN PHÍ đã được kích hoạt</p>
                </div>
                <div class="content">
                    <p>Xin chào <strong>{store_name}</strong>,</p>
                    <p>Chúc mừng! Bạn đã kích hoạt thành công gói PRO với <strong>14 ngày dùng thử MIỄN PHÍ</strong>.</p>

                    <h3>📦 Thông tin gói:</h3>
                    <ul>
                        <li><strong>Gói:</strong> PRO (Dùng thử)</li>
                        <li><strong>Thời hạn:</strong> 14 ngày</li>
                        <li><strong>Hết hạn:</strong> {trial_end_date}</li>
                    </ul>

                    <h3>🎁 Tính năng bạn có thể sử dụng:</h3>
                    <ul class="feature-list">
                        <li>✅ AI Chatbot thông minh</li>
                        <li>✅ Báo cáo nâng cao với AI</li>
                        <li>✅ Không giới hạn số bàn</li>
                        <li>✅ QR Menu</li>
                        <li>✅ Thanh toán online</li>
                        <li>✅ Báo cáo cơ bản</li>
                    </ul>

                    <p style="text-align: center;">
                        <a href="{settings.FRONTEND_URL}/admin/dashboard" class="cta-button">
                            Truy cập Dashboard ngay
                        </a>
                    </p>

                    <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ hỗ trợ qua email này.</p>

                    <div class="footer">
                        <p>Trân trọng,<br><strong>Minitake Team</strong></p>
                        <p>Hệ thống quản lý nhà hàng thông minh</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(
            to=to,
            subject=f"[Minitake] Chào mừng bạn đến với gói PRO - 14 ngày dùng thử MIỄN PHÍ",
            html=html
        )

    async def send_payment_confirmation_email(
        self,
        to: str,
        store_name: str,
        payment_id: str,
        amount: int,
        payment_method: str,
        paid_at: str,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """Send payment confirmation email.

        Args:
            to: Store owner email
            store_name: Name of the store
            payment_id: Payment ID
            amount: Amount paid (including VAT)
            payment_method: Payment method used
            paid_at: Payment timestamp
            start_date: Subscription start date
            end_date: Subscription end date
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .info-box {{ background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; }}
                .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }}
                .info-row:last-child {{ border-bottom: none; }}
                .total {{ font-size: 24px; font-weight: bold; color: #10b981; }}
                .cta-button {{ display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Thanh toán thành công!</h1>
                    <p>Cảm ơn bạn đã tin tưởng Minitake</p>
                </div>
                <div class="content">
                    <p>Xin chào <strong>{store_name}</strong>,</p>
                    <p>Chúng tôi đã nhận được thanh toán của bạn!</p>

                    <div class="info-box">
                        <h3 style="margin-top: 0;">💰 Chi tiết thanh toán</h3>
                        <div class="info-row">
                            <span>Mã giao dịch:</span>
                            <span style="font-family: monospace;">{payment_id}</span>
                        </div>
                        <div class="info-row">
                            <span>Phương thức:</span>
                            <span>{payment_method}</span>
                        </div>
                        <div class="info-row">
                            <span>Ngày thanh toán:</span>
                            <span>{paid_at}</span>
                        </div>
                    </div>

                    <div class="info-box">
                        <h3 style="margin-top: 0;">📦 Thông tin gói</h3>
                        <div class="info-row">
                            <span>Gói:</span>
                            <span><strong>PRO</strong></span>
                        </div>
                        <div class="info-row">
                            <span>Thời hạn:</span>
                            <span>1 tháng</span>
                        </div>
                        <div class="info-row">
                            <span>Bắt đầu từ:</span>
                            <span>{start_date}</span>
                        </div>
                        <div class="info-row">
                            <span>Hết hạn:</span>
                            <span>{end_date}</span>
                        </div>
                        <div class="info-row">
                            <span class="total">Tổng cộng:</span>
                            <span class="total">{self._format_currency(amount)}</span>
                        </div>
                    </div>

                    <p style="text-align: center;">
                        <a href="{settings.FRONTEND_URL}/admin/dashboard" class="cta-button">
                            Truy cập Dashboard
                        </a>
                    </p>

                    <div class="footer">
                        <p>Trân trọng,<br><strong>Minitake Team</strong></p>
                        <p>Hệ thống quản lý nhà hàng thông minh</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(
            to=to,
            subject=f"[Minitake] Xác nhận thanh toán gói PRO thành công",
            html=html
        )

    async def send_trial_expiry_reminder_email(
        self,
        to: str,
        store_name: str,
        days_remaining: int,
        trial_end_date: str
    ) -> Dict[str, Any]:
        """Send trial expiry reminder (3 days before expiry).

        Args:
            to: Store owner email
            store_name: Name of the store
            days_remaining: Days until trial expires
            trial_end_date: Date when trial ends
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .alert-box {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .cta-button {{ display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Gói PRO sắp hết hạn dùng thử</h1>
                    <p>Đừng bỏ lỡ các tính năng tuyệt vời!</p>
                </div>
                <div class="content">
                    <p>Xin chào <strong>{store_name}</strong>,</p>

                    <div class="alert-box">
                        <p style="margin: 0;"><strong>Gói PRO dùng thử của bạn sẽ hết hạn sau {days_remaining} ngày.</strong></p>
                        <p style="margin: 10px 0 0 0;">Hết hạn: {trial_end_date}</p>
                    </div>

                    <h3>💡 Để tiếp tục sử dụng PRO với đầy đủ tính năng:</h3>
                    <ul>
                        <li>Nâng cấp ngay chỉ với <strong>{self._format_currency(settings.PRO_PLAN_PRICE_VAT)}/tháng</strong></li>
                        <li>Không giới hạn số bàn</li>
                        <li>AI Chatbot thông minh</li>
                        <li>Báo cáo nâng cao với AI</li>
                    </ul>

                    <p style="text-align: center;">
                        <a href="{settings.FRONTEND_URL}/admin/subscription" class="cta-button">
                            Nâng cấp ngay
                        </a>
                    </p>

                    <p style="color: #6b7280; font-size: 14px;">
                        Nếu bạn không nâng cấp, hệ thống sẽ tự động chuyển về gói STARTER sau khi hết hạn.
                        Bạn vẫn có thể tiếp tục sử dụng Minitake với các tính năng cơ bản.
                    </p>

                    <div class="footer">
                        <p>Trân trọng,<br><strong>Minitake Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(
            to=to,
            subject=f"[Minitake] Gói PRO của bạn sắp hết hạn dùng thử ({days_remaining} ngày)",
            html=html
        )

    async def send_subscription_cancelled_email(
        self,
        to: str,
        store_name: str,
        end_date: str
    ) -> Dict[str, Any]:
        """Send subscription cancellation confirmation email.

        Args:
            to: Store owner email
            store_name: Name of the store
            end_date: Date when subscription ends
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .info-box {{ background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📋 Thông báo về gói subscription</h1>
                    <p>Yêu cầu hủy đã được xác nhận</p>
                </div>
                <div class="content">
                    <p>Xin chào <strong>{store_name}</strong>,</p>
                    <p>Chúng tôi xác nhận rằng yêu cầu hủy gói PRO của bạn đã được ghi nhận.</p>

                    <div class="info-box">
                        <h3 style="margin-top: 0;">📅 Thông tin hủy</h3>
                        <p style="margin: 10px 0 0 0;">
                            Gói PRO sẽ tiếp tục hoạt động đến hết ngày <strong>{end_date}</strong>.
                        </p>
                        <p style="margin: 10px 0 0 0;">
                            Sau thời gian này, tài khoản của bạn sẽ tự động chuyển về gói STARTER
                            với giới hạn 10 bàn.
                        </p>
                    </div>

                    <h3>📦 Gói STARTER bao gồm:</h3>
                    <ul>
                        <li>✅ Tối đa 10 bàn</li>
                        <li>✅ QR Menu</li>
                        <li>✅ Báo cáo cơ bản</li>
                        <li>✅ Thanh toán online</li>
                    </ul>

                    <p style="color: #6b7280; font-size: 14px;">
                        Nếu bạn muốn tiếp tục sử dụng gói PRO, vui lòng
                        <a href="{settings.FRONTEND_URL}/admin/subscription">gia hạn ngay</a>
                        trước khi hết hạn.
                    </p>

                    <div class="footer">
                        <p>Trân trọng,<br><strong>Minitake Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(
            to=to,
            subject=f"[Minitake] Xác nhận hủy gói PRO",
            html=html
        )

    async def send_upgrade_success_email(
        self,
        to: str,
        store_name: str,
        old_plan: str,
        new_plan: str,
        effective_date: str
    ) -> Dict[str, Any]:
        """Send upgrade success email.

        Args:
            to: Store owner email
            store_name: Name of the store
            old_plan: Previous plan name
            new_plan: New plan name
            effective_date: Date when upgrade takes effect
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .info-box {{ background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; }}
                .feature-list {{ list-style: none; padding: 0; }}
                .feature-list li {{ padding: 8px 0; }}
                .cta-button {{ display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎊 Nâng cấp thành công!</h1>
                    <p>Chào mừng bạn đến với gói {new_plan.upper()}</p>
                </div>
                <div class="content">
                    <p>Xin chào <strong>{store_name}</strong>,</p>
                    <p>Chúc mừng! Bạn đã nâng cấp thành công từ gói <strong>{old_plan.upper()}</strong> lên gói <strong>{new_plan.upper()}</strong>.</p>

                    <div class="info-box">
                        <p style="margin: 0;">Hiệu lực từ: <strong>{effective_date}</strong></p>
                    </div>

                    <h3>🚀 Tính năng mới bạn có thể sử dụng:</h3>
                    <ul class="feature-list">
                        <li>✅ Không giới hạn số bàn</li>
                        <li>✅ AI Chatbot thông minh</li>
                        <li>✅ Báo cáo nâng cao với AI</li>
                        <li>✅ Tất cả tính năng gói STARTER</li>
                    </ul>

                    <p style="text-align: center;">
                        <a href="{settings.FRONTEND_URL}/admin/dashboard" class="cta-button">
                            Khám phá ngay
                        </a>
                    </p>

                    <div class="footer">
                        <p>Trân trọng,<br><strong>Minitake Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(
            to=to,
            subject=f"[Minitake] Chúc mừng! Bạn đã nâng cấp lên gói {new_plan.upper()}",
            html=html
        )


# Create service instance
email_service = EmailService()
