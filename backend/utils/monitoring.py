"""Monitoring and health check utilities."""

import time
import psutil
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any
from collections import defaultdict

logger = logging.getLogger(__name__)


class ApplicationMetrics:
    """Track application metrics in-memory."""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize metrics storage."""
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.slow_request_count = 0
        self.endpoint_stats = defaultdict(lambda: {
            "count": 0,
            "total_time": 0,
            "errors": 0
        })
    
    def record_request(self, endpoint: str, duration_ms: float, status_code: int):
        """
        Record request metrics.
        
        Args:
            endpoint: API endpoint path
            duration_ms: Request duration in milliseconds
            status_code: HTTP status code
        """
        self.request_count += 1
        
        # Track endpoint stats
        stats = self.endpoint_stats[endpoint]
        stats["count"] += 1
        stats["total_time"] += duration_ms
        
        # Track errors
        if status_code >= 400:
            self.error_count += 1
            stats["errors"] += 1
        
        # Track slow requests
        if duration_ms > 1000:
            self.slow_request_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get all application metrics.
        
        Returns:
            Dictionary with metrics data
        """
        uptime = time.time() - self.start_time
        
        return {
            "uptime_seconds": round(uptime, 2),
            "uptime_formatted": format_uptime(uptime),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": round(self.error_count / max(self.request_count, 1) * 100, 2),
            "slow_requests": self.slow_request_count,
            "requests_per_second": round(self.request_count / max(uptime, 1), 2)
        }
    
    def get_endpoint_stats(self, limit: int = 10) -> List[Dict]:
        """
        Get top endpoints by request count.
        
        Args:
            limit: Number of endpoints to return
            
        Returns:
            List of endpoint statistics
        """
        stats_list = []
        
        for endpoint, stats in self.endpoint_stats.items():
            avg_time = stats["total_time"] / max(stats["count"], 1)
            error_rate = stats["errors"] / max(stats["count"], 1) * 100
            
            stats_list.append({
                "endpoint": endpoint,
                "request_count": stats["count"],
                "avg_response_time_ms": round(avg_time, 2),
                "error_count": stats["errors"],
                "error_rate": round(error_rate, 2)
            })
        
        # Sort by request count
        stats_list.sort(key=lambda x: x["request_count"], reverse=True)
        
        return stats_list[:limit]


def format_uptime(seconds: float) -> str:
    """
    Format uptime in human-readable format.
    
    Args:
        seconds: Uptime in seconds
        
    Returns:
        Formatted uptime string
    """
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if secs > 0 or not parts:
        parts.append(f"{secs}s")
    
    return " ".join(parts)


async def get_system_metrics() -> Dict[str, Any]:
    """
    Get system resource metrics.
    
    Returns:
        Dictionary with system metrics
    """
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu": {
                "usage_percent": round(cpu_percent, 2),
                "cores": psutil.cpu_count()
            },
            "memory": {
                "total_mb": round(memory.total / 1024 / 1024, 2),
                "available_mb": round(memory.available / 1024 / 1024, 2),
                "used_mb": round(memory.used / 1024 / 1024, 2),
                "usage_percent": round(memory.percent, 2)
            },
            "disk": {
                "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
                "available_gb": round(disk.free / 1024 / 1024 / 1024, 2),
                "used_gb": round(disk.used / 1024 / 1024 / 1024, 2),
                "usage_percent": round(disk.percent, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        return {
            "error": "Failed to retrieve system metrics",
            "details": str(e)
        }


async def check_database_health(db) -> Dict[str, Any]:
    """
    Check database connectivity and health.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        Database health status
    """
    try:
        start_time = time.time()
        
        # Ping database
        await db.command("ping")
        
        # Calculate response time
        response_time = (time.time() - start_time) * 1000
        
        # Get database stats
        stats = await db.command("dbStats")
        
        return {
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "database": stats.get("db"),
            "collections": stats.get("collections", 0),
            "data_size_mb": round(stats.get("dataSize", 0) / 1024 / 1024, 2),
            "storage_size_mb": round(stats.get("storageSize", 0) / 1024 / 1024, 2)
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
            "error_type": type(e).__name__
        }


async def get_health_check(db) -> Dict[str, Any]:
    """
    Complete health check for all services.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        Complete health status
    """
    # Get application metrics
    metrics = ApplicationMetrics()
    app_metrics = metrics.get_metrics()
    
    # Get system metrics
    system_metrics = await get_system_metrics()
    
    # Get database health
    db_health = await check_database_health(db)
    
    # Determine overall health
    is_healthy = db_health.get("status") == "healthy"
    
    # Check resource usage
    memory_usage = system_metrics.get("memory", {}).get("usage_percent", 0)
    cpu_usage = system_metrics.get("cpu", {}).get("usage_percent", 0)
    
    if memory_usage > 90 or cpu_usage > 90:
        is_healthy = False
    
    return {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "application": app_metrics,
        "system": system_metrics,
        "database": db_health
    }


async def get_readiness_check(db) -> Dict[str, bool]:
    """
    Check if application is ready to accept traffic.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        Readiness status
    """
    try:
        # Check database connection
        await db.command("ping")
        
        return {
            "ready": True,
            "database": True
        }
    except Exception:
        return {
            "ready": False,
            "database": False
        }


async def get_liveness_check() -> Dict[str, bool]:
    """
    Check if application is alive (basic health check).
    
    Returns:
        Liveness status
    """
    return {
        "alive": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Error tracking
class ErrorTracker:
    """Track application errors."""
    
    _errors = []
    _max_errors = 100
    
    @classmethod
    def log_error(cls, error: Exception, context: Dict = None):
        """
        Log an error with context.
        
        Args:
            error: Exception that occurred
            context: Additional context information
        """
        error_info = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": type(error).__name__,
            "message": str(error),
            "context": context or {}
        }
        
        # Add to list (keep only last N errors)
        cls._errors.append(error_info)
        if len(cls._errors) > cls._max_errors:
            cls._errors.pop(0)
        
        # Log to logger as well
        logger.error(
            f"Error tracked: {type(error).__name__}: {str(error)}",
            extra={"extra_data": error_info}
        )
    
    @classmethod
    def get_recent_errors(cls, limit: int = 20) -> List[Dict]:
        """
        Get recent errors.
        
        Args:
            limit: Number of errors to return
            
        Returns:
            List of recent errors
        """
        return cls._errors[-limit:]
    
    @classmethod
    def get_error_summary(cls) -> Dict:
        """
        Get error summary statistics.
        
        Returns:
            Error statistics
        """
        error_types = defaultdict(int)
        for error in cls._errors:
            error_types[error["type"]] += 1
        
        return {
            "total_errors": len(cls._errors),
            "error_types": dict(error_types),
            "most_common": sorted(
                error_types.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
        }
