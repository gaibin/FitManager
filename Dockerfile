FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    POSTURE_V2_ENABLED=true \
    POSE_LANDMARKER_MODEL=/app/models/pose_landmarker/pose_landmarker_heavy.task \
    CORS_ORIGINS=https://www.ygfit.top,https://ygfit.top,http://localhost:3000,http://localhost:5173 \
    MAX_CONTENT_LENGTH_MB=30

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.production.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend/ /app/

RUN mkdir -p /app/models/pose_landmarker \
    && python -c "import urllib.request; urllib.request.urlretrieve('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task', '/app/models/pose_landmarker/pose_landmarker_heavy.task')"

RUN test -f "$POSE_LANDMARKER_MODEL" \
    && python -m compileall -q /app

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:' + __import__('os').environ.get('PORT', '7860') + '/api/health', timeout=8)"

CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-7860} --workers 1 --threads 1 --timeout 180 --graceful-timeout 30 --access-logfile - --error-logfile - app:app"]
