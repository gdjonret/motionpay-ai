FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.lock ./requirements.lock
RUN pip install --no-cache-dir -r requirements.lock
COPY backend/app ./app
COPY mobile/src/data/catalog.json ./catalog.json
COPY mobile/assets/exercises ./exercise-media
ENV EXERCISE_CATALOG_PATH=/app/catalog.json
ENV EXERCISE_MEDIA_PATH=/app/exercise-media
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --no-access-log --no-proxy-headers"]
