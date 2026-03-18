const pool = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email y contraseña son requeridos'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const access_token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }  
    );

    return res.status(200).json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      access_token,
      token_type: 'Bearer',
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  return res.status(200).json({
    message: "Logout exitoso"
  });
};

module.exports = { login, logout };