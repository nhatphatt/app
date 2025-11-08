"""Logging configuration for structured logging.

This module sets up structured logging with JSON formatting for production
and human-readable formatting for development.
"""

import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict
from pathlib import Path

from config.settings import settings


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON-formatted log string
        """
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields from record
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)
        
        # Add request context if available
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "store_id"):
            log_data["store_id"] = record.store_id
        
        return json.dumps(log_data, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for development logging."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record with colors for development.
        
        Args:
            record: Log record to format
            
        Returns:
            Colored log string
        """
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # Format log message
        log_msg = (
            f"{color}[{timestamp}] {record.levelname:8s}{reset} "
            f"{record.name:20s} │ {record.getMessage()}"
        )
        
        # Add location info for errors
        if record.levelno >= logging.ERROR:
            log_msg += f" ({record.module}.{record.funcName}:{record.lineno})"
        
        # Add exception info if present
        if record.exc_info:
            log_msg += f"\n{self.formatException(record.exc_info)}"
        
        return log_msg


class LoggerAdapter(logging.LoggerAdapter):
    """Custom logger adapter to add context to logs."""
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """
        Process log message and add extra context.
        
        Args:
            msg: Log message
            kwargs: Keyword arguments
            
        Returns:
            Tuple of (msg, kwargs) with extra data
        """
        # Add extra data from adapter
        extra = kwargs.get('extra', {})
        extra.update(self.extra)
        kwargs['extra'] = extra
        
        return msg, kwargs


def setup_logging(
    app_name: str = "minitake",
    log_level: str = None,
    log_file: str = None
) -> logging.Logger:
    """
    Setup structured logging for the application.
    
    Args:
        app_name: Application name for logger
        log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        
    Returns:
        Configured root logger
    """
    # Determine log level
    if log_level is None:
        log_level = "DEBUG" if settings.ENVIRONMENT == "development" else "INFO"
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # Use JSON formatter in production, colored in development
    if settings.ENVIRONMENT == "production":
        formatter = JSONFormatter()
    else:
        formatter = ColoredFormatter()
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(JSONFormatter())  # Always JSON for files
        root_logger.addHandler(file_handler)
    
    # Set third-party loggers to WARNING to reduce noise
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)
    
    # Log startup message
    logger = logging.getLogger(app_name)
    logger.info(
        f"Logging initialized",
        extra={
            "extra_data": {
                "environment": settings.ENVIRONMENT,
                "log_level": log_level,
                "log_file": log_file
            }
        }
    )
    
    return root_logger


def get_logger(name: str, **context) -> LoggerAdapter:
    """
    Get a logger with optional context.
    
    Args:
        name: Logger name (usually __name__)
        **context: Additional context to include in all logs
        
    Returns:
        Logger adapter with context
    """
    logger = logging.getLogger(name)
    
    if context:
        return LoggerAdapter(logger, context)
    
    return logger


# Convenience functions for common log patterns
def log_api_call(logger: logging.Logger, method: str, path: str, **extra):
    """Log an API call with context."""
    logger.info(
        f"API call: {method} {path}",
        extra={"extra_data": {"method": method, "path": path, **extra}}
    )


def log_database_query(logger: logging.Logger, collection: str, operation: str, **extra):
    """Log a database query with context."""
    logger.debug(
        f"DB query: {operation} on {collection}",
        extra={"extra_data": {"collection": collection, "operation": operation, **extra}}
    )


def log_error(logger: logging.Logger, error: Exception, context: str = "", **extra):
    """Log an error with full context."""
    logger.error(
        f"{context}: {str(error)}" if context else str(error),
        exc_info=True,
        extra={"extra_data": {
            "error_type": type(error).__name__,
            "context": context,
            **extra
        }}
    )


def log_performance(logger: logging.Logger, operation: str, duration_ms: float, **extra):
    """Log performance metrics."""
    level = logging.WARNING if duration_ms > 1000 else logging.DEBUG
    logger.log(
        level,
        f"Performance: {operation} took {duration_ms:.2f}ms",
        extra={"extra_data": {
            "operation": operation,
            "duration_ms": duration_ms,
            **extra
        }}
    )
