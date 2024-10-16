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
