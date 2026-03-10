const express = require('express');
require('dotenv').config();
require('./db/connection');

const app = express();
app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});