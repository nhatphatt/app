"""Security utilities."""
import hmac
import hashlib
from config.settings import settings


def verify_webhook_signature(payload: str, signature: str, secret: str = None) -> bool:
    """
    Verify webhook signature using HMAC-SHA256.
    
    Args:
        payload: Raw webhook payload string
        signature: Signature from webhook header
        secret: Webhook secret key (defaults to settings.WEBHOOK_SECRET)
        
    Returns:
        True if signature is valid, False otherwise
    """
    if secret is None:
        secret = settings.WEBHOOK_SECRET
    
    if not secret:
        # If no secret configured, skip verification in development
        # This should never happen in production due to settings validation
        return settings.ENVIRONMENT != 'production'
    
    computed_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature)


def sanitize_slug(slug: str) -> str:
    """
    Sanitize and normalize a slug.
    
    Args:
        slug: Raw slug string
        
    Returns:
        Sanitized slug (lowercase, alphanumeric + hyphens only)
    """
    import re
    # Remove special characters, keep only alphanumeric and hyphens
    slug = re.sub(r'[^a-z0-9-]', '', slug.lower())
    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug
