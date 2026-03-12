const pool = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { categoryDecorator} = require('../decorators/category.decorator');

const store = async (req, res) => {
  const { name } = req.body;
  const user_id = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND user_id = ?',
      [name, user_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO categories (id, name, user_id) VALUES (?, ?, ?)',
      [id, name, user_id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ?', 
      [id]
    );

    return res.status(201).json({
      message: 'Categoría creada exitosamente',
      category: categoryDecorator(rows[0])
    });

  } catch (error) {
    console.error('Error al crear categoría:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const index = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );

    return res.status(200).json({
      categories: rows.map(category => categoryDecorator(category))
    });

  } catch (error) {
    console.error('Error al listar categorías:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const show = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    return res.status(200).json({ 
      category: categoryDecorator(rows[0]) 
    });

  } catch (error) {
    console.error('Error al obtener categoría:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const user_id = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const [duplicate] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND user_id = ? AND id != ?',
      [name, user_id, id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    }

    await pool.query(
      'UPDATE categories SET name = ? WHERE id = ? AND user_id = ?',
      [name, id, user_id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ?', 
      [id]
    );

    return res.status(200).json({
      message: 'Categoría actualizada exitosamente',
      category: categoryDecorator(rows[0])
    });

  } catch (error) {
    console.error('Error al actualizar categoría:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const destroy = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const [tasks] = await pool.query(
      'SELECT id FROM tasks WHERE category_id = ?',
      [id]
    );

    if (tasks.length > 0) {
      return res.status(409).json({ 
        error: 'No se puede eliminar, la categoría tiene tareas asociadas' 
      });
    }

    await pool.query(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    return res.status(200).json({ 
      message: 'Categoría eliminada exitosamente' 
    });

  } catch (error) {
    console.error('Error al eliminar categoría:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  store,
  index,
  show,
  update,
  destroy
};