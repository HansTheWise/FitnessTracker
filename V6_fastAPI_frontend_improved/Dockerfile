# Stage 1: "Builder" - Installiert die Abhängigkeiten in einer sauberen Umgebung
# Wir nutzen eine vollwertige Python-Version, da sie ggf. Build-Tools enthält
FROM python:3.11 AS builder

# Setzt das Arbeitsverzeichnis im Container
WORKDIR /app

# Erstellt eine virtuelle Umgebung, um Abhängigkeiten zu isolieren
RUN python -m venv /opt/venv
# Aktiviert die virtuelle Umgebung für nachfolgende Befehle
ENV PATH="/opt/venv/bin:$PATH"

# Kopiert nur die Anforderungsdatei, um den Docker-Cache zu nutzen
COPY requirements.txt .

# Installiert die Python-Pakete
RUN pip install --upgrade pip && \
          pip install -r requirements.txt

# --------------------------------------------------------------------

# Stage 2: "Runtime" - Baut das finale, schlanke Image für die Produktion
# Wir nutzen ein "slim"-Image, das deutlich kleiner ist
FROM python:3.11-slim AS runtime

# Setzt das Arbeitsverzeichnis
WORKDIR /app

# Kopiert die installierten Pakete aus der virtuellen Umgebung des "Builder"-Stages
COPY --from=builder /opt/venv /opt/venv

# Kopiert den gesamten Quellcode der Anwendung in das Arbeitsverzeichnis
COPY . .

# Aktiviert die virtuelle Umgebung im finalen Image
ENV PATH="/opt/venv/bin:$PATH"

# Exponiert den Port, auf dem die Anwendung laufen wird
EXPOSE 8000

# Der Befehl zum Starten der Anwendung, wenn der Container gestartet wird.
# Uvicorn lauscht auf 0.0.0.0, um von außerhalb des Containers erreichbar zu sein.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]