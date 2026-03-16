const express = require('express');
require('dotenv').config();
require('./db/connection');

const app = express();
app.use(express.json());
// Rutas
const categoryRoutes = require('./routes/category.routes');
app.use('/api/categories', categoryRoutes);

// Rutas
const userRoutes = require('./routes/user.routes');
app.use('/users', userRoutes);

// Rutas
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const tagRoutes = require('./routes/tag.routes');

app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/tags', tagRoutes);

app.get((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Rutas
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const tagRoutes = require('./routes/tag.routes');
const taskRoutes = require('./routes/task.routes');

app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/tags', tagRoutes);
app.use('tasks',tagRoutes);

app.get((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});