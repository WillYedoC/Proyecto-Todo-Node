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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});