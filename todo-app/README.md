Nous allons créer une application complète composée d'un **frontend**, d'un **backend** et d'une **base de données**, le tout conteneurisé avec Docker et orchestré avec Docker Compose. Pour cet exemple, nous allons développer une simple **Todo List**.

### **Table des Matières**

1. [Structure du Projet](#structure-du-projet)
2. [Création du Backend (Node.js + Express)](#création-du-backend-nodejs--express)
    - [Fichiers Backend](#fichiers-backend)
    - [Dockerfile Backend](#dockerfile-backend)
3. [Création du Frontend (React)](#création-du-frontend-react)
    - [Fichiers Frontend](#fichiers-frontend)
    - [Dockerfile Frontend](#dockerfile-frontend)
4. [Configuration de la Base de Données (PostgreSQL)](#configuration-de-la-base-de-données-postgresql)
5. [Fichier Docker Compose](#fichier-docker-compose)
6. [Lancer les Conteneurs](#lancer-les-conteneurs)
7. [Tester l'Application](#tester-lapplication)
8. [Conseils Supplémentaires](#conseils-supplémentaires)

---

## Structure du Projet

Organisons notre projet avec la structure suivante :

```
todo-app/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── index.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── App.js
│       └── index.js
├── docker-compose.yml
└── README.md
```

---

## Création du Backend (Node.js + Express)

Le backend sera une application Node.js utilisant Express pour fournir une API RESTful permettant de gérer les tâches de la Todo List. Il communiquera avec une base de données PostgreSQL.

### Fichiers Backend

#### 1. **Fichier `package.json`**

Créez un fichier `package.json` dans le dossier `backend/` avec le contenu suivant :

```json
{
  "name": "todo-backend",
  "version": "1.0.0",
  "description": "Backend pour l'application Todo List",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "pg": "^8.10.0",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

#### 2. **Fichier `index.js`**

Créez un fichier `index.js` dans le dossier `backend/` avec le contenu suivant :

```javascript
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuration de la base de données
const pool = new Pool({
  host: 'db', // Nom du service de la base de données défini dans docker-compose.yml
  user: 'postgres',
  password: 'password',
  database: 'todo_db',
  port: 5432,
});

// Routes

// Vérifier la connexion à la base de données
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({ status: 'OK', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Obtenir toutes les tâches
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Créer une nouvelle tâche
app.post('/api/todos', async (req, res) => {
  const { title, completed } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *',
      [title, completed]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Mettre à jour une tâche
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  try {
    const result = await pool.query(
      'UPDATE todos SET title = $1, completed = $2 WHERE id = $3 RETURNING *',
      [title, completed, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Tâche non trouvée');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Supprimer une tâche
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Tâche non trouvée');
    }
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Backend en écoute sur le port ${port}`);
});
```

#### 3. **Initialisation de la Base de Données**

Pour initialiser la base de données avec une table `todos`, nous allons utiliser une commande SQL lors du démarrage du conteneur PostgreSQL. Nous allons créer un script SQL que PostgreSQL exécutera automatiquement.

Créez un dossier `backend/initdb/` et ajoutez un fichier `init.sql` avec le contenu suivant :

**Structure du projet mise à jour :**

```
todo-app/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── index.js
│   └── initdb/
│       └── init.sql
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── App.js
│       └── index.js
├── docker-compose.yml
└── README.md
```

**Fichier `init.sql` :**

```sql
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE
);
```

Ce script crée une table `todos` avec les champs `id`, `title` et `completed`.

---

### Dockerfile Backend

Créez un fichier `Dockerfile` dans le dossier `backend/` avec le contenu suivant :

```dockerfile
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
```

---

## Création du Frontend (React)

Le frontend sera une application React simple qui interagit avec le backend pour afficher, ajouter, mettre à jour et supprimer des tâches.

### Fichiers Frontend

#### 1. **Fichier `package.json`**

Créez un fichier `package.json` dans le dossier `frontend/` avec le contenu suivant :

```json
{
  "name": "todo-frontend",
  "version": "1.0.0",
  "description": "Frontend pour l'application Todo List",
  "private": true,
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}
```

#### 2. **Fichier `src/index.js`**

Créez le dossier `frontend/src/` et ajoutez un fichier `index.js` avec le contenu suivant :

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

#### 3. **Fichier `src/App.js`**

Créez un fichier `App.js` dans le dossier `frontend/src/` avec le contenu suivant :

```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');

  // Récupérer les tâches depuis le backend
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await axios.get('/api/todos');
      setTodos(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches:', error);
    }
  };

  const addTodo = async () => {
    if (title.trim() === '') return;
    try {
      const response = await axios.post('/api/todos', { title, completed: false });
      setTodos([...todos, response.data]);
      setTitle('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la tâche:', error);
    }
  };

  const toggleTodo = async (id, completed) => {
    try {
      const response = await axios.put(`/api/todos/${id}`, { completed: !completed });
      setTodos(todos.map(todo => todo.id === id ? response.data : todo));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la tâche:', error);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`/api/todos/${id}`);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error);
    }
  };

  return (
    <div className="App">
      <h1>Todo List</h1>
      <div className="add-todo">
        <input
          type="text"
          placeholder="Nouvelle tâche"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button onClick={addTodo}>Ajouter</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id, todo.completed)}
            />
            {todo.title}
            <button onClick={() => deleteTodo(todo.id)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

#### 4. **Fichier `src/App.css`**

Ajoutez un fichier `App.css` dans le dossier `frontend/src/` pour styliser l'application :

```css
.App {
  text-align: center;
  font-family: Arial, sans-serif;
  margin: 20px;
}

.add-todo {
  margin-bottom: 20px;
}

.add-todo input {
  padding: 10px;
  width: 200px;
  font-size: 16px;
}

.add-todo button {
  padding: 10px 20px;
  font-size: 16px;
  margin-left: 10px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  text-align: left;
  margin: 10px 0;
  display: flex;
  align-items: center;
}

li.completed span {
  text-decoration: line-through;
  color: gray;
}

li input[type="checkbox"] {
  margin-right: 10px;
}

li button {
  margin-left: auto;
  padding: 5px 10px;
}
```

### Dockerfile Frontend

Créez un fichier `Dockerfile` dans le dossier `frontend/` avec le contenu suivant :

```dockerfile
# Étape 1 : Construire l'application
FROM node:18 as build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Construire l'application pour la production
RUN npm run build

# Étape 2 : Servir l'application avec Nginx
FROM nginx:alpine

# Copier les fichiers construits depuis l'étape précédente
COPY --from=build /app/build /usr/share/nginx/html

# Copier le fichier de configuration Nginx pour rediriger les requêtes API
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Fichier de Configuration Nginx (`nginx.conf`)

Pour permettre au frontend de communiquer avec le backend via des appels API sans problèmes de CORS, nous allons configurer Nginx pour rediriger les requêtes `/api` vers le backend.

Créez un fichier `nginx.conf` dans le dossier `frontend/` avec le contenu suivant :

```nginx
server {
    listen 80;

    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Remarque :** Assurez-vous que le nom `backend` correspond au nom du service backend dans `docker-compose.yml`.

---

## Configuration de la Base de Données (PostgreSQL)

Nous utiliserons l'image officielle PostgreSQL et configurerons les paramètres nécessaires via `docker-compose.yml`. Le script `init.sql` que nous avons créé précédemment sera exécuté automatiquement pour initialiser la base de données.

---

## Fichier Docker Compose

Créez un fichier `docker-compose.yml` à la racine de votre projet `todo-app/` avec le contenu suivant :

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: todo_db
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./backend/initdb:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DB_HOST: db
      DB_USER: postgres
      DB_PASSWORD: password
      DB_NAME: todo_db
    depends_on:
      - db
    ports:
      - "5000:5000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:80"

volumes:
  db-data:
```

### Explications des Services

1. **db** : Service PostgreSQL
    - **image** : Utilise l'image officielle PostgreSQL version 14.
    - **environment** : Variables d'environnement pour configurer l'utilisateur, le mot de passe et la base de données.
    - **volumes** :
        - `db-data` : Persiste les données de la base de données.
        - `./backend/initdb` : Monte le dossier contenant le script `init.sql` pour initialiser la base de données.
    - **ports** : Expose le port `5432` sur l'hôte.

2. **backend** : Service Backend
    - **build** : Construit l'image à partir du dossier `./backend`.
    - **environment** : Variables d'environnement pour la connexion à la base de données.
    - **depends_on** : Assure que le service `db` démarre avant le backend.
    - **ports** : Expose le port `5000` sur l'hôte.

3. **frontend** : Service Frontend
    - **build** : Construit l'image à partir du dossier `./frontend`.
    - **depends_on** : Assure que le service `backend` démarre avant le frontend.
    - **ports** : Expose le port `3000` sur l'hôte (Nginx écoute sur le port `80` dans le conteneur).

---

## Lancer les Conteneurs

Suivez les étapes ci-dessous pour construire et lancer les conteneurs Docker.

### Prérequis

- **Docker** et **Docker Compose** installés sur votre machine.
- Le code source organisé selon la structure mentionnée précédemment.

### Étapes

1. **Naviguer vers le Répertoire du Projet**

   Ouvrez votre terminal et naviguez vers le répertoire racine de votre projet `todo-app/` :

   ```bash
   cd /chemin/vers/todo-app
   ```

2. **Construire et Démarrer les Conteneurs**

   Utilisez la commande suivante pour construire les images et démarrer les conteneurs :

   ```bash
   docker-compose up --build
   ```

   **Options :**
   - `--build` : Force la reconstruction des images.
   - Par défaut, les logs des conteneurs s'affichent dans le terminal.

   **Pour exécuter les conteneurs en arrière-plan (mode détaché) :**

   ```bash
   docker-compose up --build -d
   ```

3. **Vérifier que les Conteneurs Fonctionnent**

   Utilisez la commande suivante pour vérifier l'état des conteneurs :

   ```bash
   docker-compose ps
   ```

   Vous devriez voir trois services en cours d'exécution : `db`, `backend` et `frontend`.

---

## Tester l'Application

Une fois les conteneurs en cours d'exécution, vous pouvez tester l'application pour vous assurer que tout fonctionne correctement.

### 1. Accéder au Frontend

Ouvrez votre navigateur et allez à l'adresse suivante :

```
http://localhost:3000
```

Vous devriez voir l'interface de la Todo List où vous pouvez ajouter, marquer comme complétée ou supprimer des tâches.

### 2. Vérifier la Communication Backend-Base de Données

Pour vous assurer que le backend communique correctement avec la base de données, vous pouvez effectuer une vérification de santé.

#### a. Utiliser un Navigateur ou `curl`

Accédez à l'URL suivante pour vérifier la santé du backend :

```
http://localhost:5000/api/health
```

Vous devriez recevoir une réponse JSON similaire à :

```json
{
  "status": "OK",
  "time": "2024-04-27T12:34:56.789Z"
}
```

#### b. Utiliser les Logs du Backend

Consultez les logs du backend pour vérifier les connexions :

```bash
docker-compose logs backend
```

Vous devriez voir des messages indiquant que le backend est en écoute sur le port `5000` et qu'il s'est connecté à la base de données.

### 3. Tester les Endpoints de l'API

Vous pouvez utiliser `curl` ou des outils comme **Postman** pour tester les endpoints de l'API.

#### a. Obtenir Toutes les Tâches

```bash
curl http://localhost:5000/api/todos
```

#### b. Ajouter une Nouvelle Tâche

```bash
curl -X POST http://localhost:5000/api/todos \
     -H "Content-Type: application/json" \
     -d '{"title": "Nouvelle Tâche", "completed": false}'
```

#### c. Mettre à Jour une Tâche

```bash
curl -X PUT http://localhost:5000/api/todos/1 \
     -H "Content-Type: application/json" \
     -d '{"title": "Tâche Mise à Jour", "completed": true}'
```

#### d. Supprimer une Tâche

```bash
curl -X DELETE http://localhost:5000/api/todos/1
```

### 4. Interagir avec le Frontend

Utilisez l'interface web pour ajouter, marquer comme complétée ou supprimer des tâches. Assurez-vous que les actions sont reflétées correctement et que les données sont persistées dans la base de données.

---

## Conseils Supplémentaires

1. **Arrêter les Conteneurs**

   Pour arrêter les conteneurs en cours d'exécution :

   ```bash
   docker-compose down
   ```

   **Options :**
   - Ajouter `-v` pour également supprimer les volumes (ce qui supprimera les données de la base de données) :

     ```bash
     docker-compose down -v
     ```

2. **Revoir les Logs**

   Pour consulter les logs de tous les services :

   ```bash
   docker-compose logs
   ```

   Pour consulter les logs d'un service spécifique (par exemple, `backend`) :

   ```bash
   docker-compose logs backend
   ```

3. **Redémarrer les Conteneurs Après des Modifications**

   Si vous apportez des modifications au code backend ou frontend, reconstruisez les images et redémarrez les conteneurs :

   ```bash
   docker-compose up --build
   ```

   **Ou en mode détaché :**

   ```bash
   docker-compose up --build -d
   ```

4. **Gestion des Variables d'Environnement**

   Pour une meilleure gestion des variables d'environnement, vous pouvez utiliser un fichier `.env` à la racine du projet et référencer ces variables dans le `docker-compose.yml`. Cela permet de séparer la configuration du code.

5. **Sécurité en Production**

   - **Mots de Passe** : Ne stockez pas de mots de passe en clair. Utilisez des secrets ou des variables d'environnement sécurisées.
   - **Réseaux Privés** : Configurez les réseaux Docker pour isoler les services.
   - **Mises à Jour** : Assurez-vous que les images Docker utilisées sont à jour pour bénéficier des dernières mises à jour de sécurité.

6. **Volumes pour la Persistance des Données**

   Les volumes Docker sont utilisés pour persister les données de la base de données entre les redémarrages des conteneurs. Assurez-vous de ne pas les supprimer accidentellement, sauf si vous souhaitez réinitialiser les données.

7. **Dockerignore**

   Pour optimiser la construction des images Docker, ajoutez un fichier `.dockerignore` dans les dossiers `backend/` et `frontend/` pour exclure les fichiers inutiles.

   **Exemple de `.dockerignore` pour le Backend :**

   ```
   node_modules
   npm-debug.log
   ```

   **Exemple de `.dockerignore` pour le Frontend :**

   ```
   node_modules
   build
   npm-debug.log
   ```

---

## Conclusion

Vous avez maintenant une application Todo List complète composée d'un frontend React, d'un backend Node.js avec Express, et d'une base de données PostgreSQL, le tout orchestré avec Docker et Docker Compose. Cette configuration permet de développer, tester et déployer facilement l'application dans un environnement cohérent.

### **Prochaines Étapes**

1. **Déploiement sur un Cluster Kubernetes**
   - Après avoir vérifié que tout fonctionne en local, vous pouvez envisager de déployer votre application sur un cluster Kubernetes.
   - Créez des fichiers de déploiement et de service Kubernetes pour chaque composant.
   - Utilisez des outils comme `kubectl` pour gérer le déploiement.

2. **Optimisations**
   - Implémentez une authentification et une autorisation pour sécuriser l'API.
   - Ajoutez des fonctionnalités supplémentaires à la Todo List, comme la gestion des utilisateurs.
   - Intégrez des outils de surveillance et de journalisation pour suivre les performances et les erreurs.

3. **CI/CD**
   - Mettez en place des pipelines d'intégration continue et de déploiement continu pour automatiser les tests et le déploiement de l'application.

