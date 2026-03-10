const pool = require('../db/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const createUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ 
      error: 'Todos los campos son requeridos (name, email, password)' 
    });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'El email ya está registrado' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, name, email, hashedPassword]
    );

    return res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id, name, email }
    });

  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { createUser };