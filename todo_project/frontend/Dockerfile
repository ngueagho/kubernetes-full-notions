# Utiliser une image node officielle comme image parente
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code de l'application
COPY . .

# Construire l'application pour la production
RUN npm run build

# Installer un serveur pour servir les fichiers statiques
RUN npm install -g serve

# Exposer le port que l'application utilisera
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["serve", "-s", "build", "-l", "3000"]
