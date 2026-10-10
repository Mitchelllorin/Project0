# The API: geometry, catalogues and quote. Stateless — all state lives in MongoDB.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Never run the API as root.
RUN useradd --system --uid 10001 --no-create-home studio
USER studio

EXPOSE 8001

# No shell, no curl: /api/ answers without touching MongoDB, so this stays truthful
# even while the database is still coming up.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8001/api/').status == 200 else 1)"

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
