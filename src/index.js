const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());
// Rutas
const categoryRoutes = require('./routes/category.routes');
app.use('/api/categories', categoryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});