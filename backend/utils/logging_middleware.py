"""Logging middleware for request/response tracking."""

import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Log request and response with timing.
        
        Args:
            request: FastAPI request
            call_next: Next middleware/endpoint
            
        Returns:
            Response with added headers
        """
        # Generate request ID
        request_id = str(uuid.uuid4())
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Extract request info
        method = request.method
        url_path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log request
        logger.info(
            f"Request started: {method} {url_path}",
            extra={
                "extra_data": {
                    "request_id": request_id,
                    "method": method,
                    "path": url_path,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                    "query_params": dict(request.query_params) if request.query_params else None
                }
            }
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = (time.time() - start_time) * 1000  # milliseconds
            
            # Add headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.2f}"
            
            # Log response
            log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(
                log_level,
                f"Request completed: {method} {url_path} - {response.status_code}",
                extra={
                    "extra_data": {
                        "request_id": request_id,
                        "method": method,
                        "path": url_path,
                        "status_code": response.status_code,
                        "process_time_ms": round(process_time, 2),
                        "client_ip": client_ip
                    }
                }
            )
            
            # Log slow requests
            if process_time > 1000:
                logger.warning(
                    f"Slow request detected: {method} {url_path} took {process_time:.2f}ms",
                    extra={
                        "extra_data": {
                            "request_id": request_id,
                            "method": method,
                            "path": url_path,
                            "process_time_ms": round(process_time, 2)
                        }
                    }
                )
            
            return response
            
        except Exception as e:
            # Calculate processing time even for errors
            process_time = (time.time() - start_time) * 1000
            
            # Log error
            logger.error(
                f"Request failed: {method} {url_path} - {type(e).__name__}: {str(e)}",
                exc_info=True,
                extra={
                    "extra_data": {
                        "request_id": request_id,
                        "method": method,
                        "path": url_path,
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "process_time_ms": round(process_time, 2),
                        "client_ip": client_ip
                    }
                }
            )
            
            # Re-raise to let FastAPI handle it
            raise


class UserContextMiddleware(BaseHTTPMiddleware):
    """Middleware to add user context to logs."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add user/store context to request state for logging.
        
        Args:
            request: FastAPI request
            call_next: Next middleware/endpoint
            
        Returns:
            Response
        """
        # Try to extract user from JWT token (if authenticated)
        auth_header = request.headers.get("authorization", "")
        
        if auth_header.startswith("Bearer "):
            try:
                # Import here to avoid circular dependency
                from utils.auth import get_current_user
                from fastapi.security import HTTPAuthorizationCredentials
                
                # Create credentials object
                token = auth_header.replace("Bearer ", "")
                credentials = HTTPAuthorizationCredentials(
                    scheme="Bearer",
                    credentials=token
                )
                
                # Get user (this validates the token)
                user = await get_current_user(credentials)
                
                # Add to request state
                request.state.user_id = user.get("id")
                request.state.store_id = user.get("store_id")
                
            except Exception:
                # Token invalid or expired, ignore
                pass
        
        # Process request
        response = await call_next(request)
        
        return response


def setup_logging_middleware(app):
    """
    Setup all logging middleware.
    
    Args:
        app: FastAPI application
    """
    # Add user context middleware (first to capture user info)
    app.add_middleware(UserContextMiddleware)
    
    # Add request logging middleware
    app.add_middleware(RequestLoggingMiddleware)
    
    logger.info("✅ Logging middleware configured")
