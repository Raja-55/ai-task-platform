# syntax=docker/dockerfile:1
FROM python:3.11-slim AS runner
WORKDIR /app
RUN useradd -m -u 10001 appuser
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py ./
USER appuser
CMD ["python", "worker.py"]
