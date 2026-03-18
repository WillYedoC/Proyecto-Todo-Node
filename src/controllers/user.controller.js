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

    const access_token = jwt.sign(
      { id, name, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      access_token,
      user: { id, name, email }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno al crear un usuario' });
  }
};

const profile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { createUser,profile };