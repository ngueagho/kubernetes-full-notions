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
