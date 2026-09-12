FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and ReportLab
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure media storage directories exist
RUN mkdir -p /app/media/uploads /app/media/enhanced /app/media/explanations /app/media/reports

# Support dynamic hosting platform port binding ($PORT)
ENV HOST=0.0.0.0
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

