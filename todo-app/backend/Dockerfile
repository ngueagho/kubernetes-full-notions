# Utiliser l'image officielle Node.js LTS
FROM node:18

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port sur lequel l'application va écouter
EXPOSE 5000

# Commande pour démarrer l'application
CMD ["npm", "start"]
