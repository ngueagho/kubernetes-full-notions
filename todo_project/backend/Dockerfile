# Utiliser une image Python officielle comme image parente
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copier le reste du code de l'application
COPY . .

# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput

# Exposer le port que l'application utilisera
EXPOSE 8000

# Commande pour démarrer le serveur
CMD ["gunicorn", "todo_project.wsgi:application", "--bind", "0.0.0.0:8000"]
