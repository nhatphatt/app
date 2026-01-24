# Use Python 3.12 slim image with updated SSL libraries
FROM python:3.12-slim

# Install minimal system dependencies + ca-certificates for SSL
RUN apt-get update && apt-get install -y \
    gcc \
    ca-certificates \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ backend/

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Set Python path
ENV PYTHONPATH=/app/backend

# Run the application
CMD ["sh", "-c", "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
