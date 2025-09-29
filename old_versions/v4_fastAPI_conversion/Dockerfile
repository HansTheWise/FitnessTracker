# Stufe 1: Das Fundament - ein offizielles, schlankes Python-Image.
FROM python:3.11-slim as base

# Setze Umgebungsvariablen für eine konsistente Ausführung.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Stufe 2: Installation der Abhängigkeiten
FROM base as python-deps

# Installiere System-Abhängigkeiten, die für einige Python-Pakete benötigt werden könnten.
RUN apt-get update && apt-get install -y --no-install-recommends build-essential

# Setze das Arbeitsverzeichnis im Container.
WORKDIR /app

# Kopiere nur die requirements.txt und installiere die Pakete.
# Dies nutzt Docker's Caching: Solange sich die requirements.txt nicht ändert,
# muss dieser langsame Schritt nicht wiederholt werden.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stufe 3: Die eigentliche Anwendung
FROM python-deps as runtime

# Kopiere die Abhängigkeiten aus der vorherigen Stufe.
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Kopiere den gesamten restlichen Anwendungscode.
COPY . .

# Gib den Port frei, auf dem die Anwendung lauschen wird.
EXPOSE 5001

# Der Befehl, der ausgeführt wird, wenn der Container startet.
# Starte Gunicorn und binde es an die 'app'-Instanz in der 'run.py'-Datei.
# In Produktion wird dieser Befehl verwendet.
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "run:app"]