"""Custom middleware for performance optimization."""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
import time
import logging

logger = logging.getLogger(__name__)


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor request performance."""
    
    async def dispatch(self, request: Request, call_next):
        """
        Monitor request processing time.
        
        Args:
            request: FastAPI request
            call_next: Next middleware/endpoint
            
        Returns:
            Response with performance headers
        """
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Add custom headers
        response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))  # milliseconds
        
        # Log slow requests (> 1 second)
        if process_time > 1.0:
            logger.warning(
                f"Slow request: {request.method} {request.url.path} "
                f"took {process_time:.2f}s"
            )
        
        return response


class CacheControlMiddleware(BaseHTTPMiddleware):
    """Middleware to add cache control headers."""
    
    def __init__(self, app, cacheable_paths: list = None):
        """
        Initialize cache control middleware.
        
        Args:
            app: FastAPI application
            cacheable_paths: List of path patterns that can be cached
        """
        super().__init__(app)
        self.cacheable_paths = cacheable_paths or [
            "/api/public/",  # Public menu endpoints
        ]
    
    async def dispatch(self, request: Request, call_next):
        """
        Add cache control headers based on path.
        
        Args:
            request: FastAPI request
            call_next: Next middleware/endpoint
            
        Returns:
            Response with cache headers
        """
        response = await call_next(request)
        
        # Check if path is cacheable
        is_cacheable = any(
            request.url.path.startswith(pattern) 
            for pattern in self.cacheable_paths
        )
        
        if is_cacheable and request.method == "GET":
            # Cache for 5 minutes for public endpoints
            response.headers["Cache-Control"] = "public, max-age=300"
        else:
            # No cache for authenticated/mutation endpoints
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response


def setup_middleware(app):
    """
    Setup all performance middleware.
    
    Args:
        app: FastAPI application
    """
    # Add GZip compression (built-in from Starlette)
    # Compresses responses larger than 1KB
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Add performance monitoring
    app.add_middleware(PerformanceMonitoringMiddleware)
    
    # Add cache control
    app.add_middleware(
        CacheControlMiddleware,
        cacheable_paths=[
            "/api/public/",
            "/health",
        ]
    )
    
    logger.info("✅ Performance middleware configured")
