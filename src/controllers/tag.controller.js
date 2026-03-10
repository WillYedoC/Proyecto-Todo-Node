const pool = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { tagDecorator, tagListDecorator } = require('../decorators/tag.decorator');

const createTag = async (req, res) => {
  const { name } = req.body;
  const user_id = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM tags WHERE name = ? AND user_id = ?',
      [name, user_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO tags (id, name, user_id) VALUES (?, ?, ?)',
      [id, name, user_id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM tags WHERE id = ?',
      [id]
    );

    return res.status(201).json({
      message: 'Etiqueta creada exitosamente',
      tag: tagDecorator(rows[0])
    });

  } catch (error) {
    console.error('Error al crear etiqueta:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getTags = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );

    return res.status(200).json({
      tags: tagListDecorator(rows)
    });

  } catch (error) {
    console.error('Error al listar etiquetas:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getTagById = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM tags WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }

    return res.status(200).json({
      tag: tagDecorator(rows[0])
    });

  } catch (error) {
    console.error('Error al obtener etiqueta:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateTag = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const user_id = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM tags WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }

    const [duplicate] = await pool.query(
      'SELECT id FROM tags WHERE name = ? AND user_id = ? AND id != ?',
      [name, user_id, id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Ya existe una etiqueta con ese nombre' });
    }

    await pool.query(
      'UPDATE tags SET name = ? WHERE id = ? AND user_id = ?',
      [name, id, user_id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM tags WHERE id = ?',
      [id]
    );

    return res.status(200).json({
      message: 'Etiqueta actualizada exitosamente',
      tag: tagDecorator(rows[0])
    });

  } catch (error) {
    console.error('Error al actualizar etiqueta:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteTag = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [existing] = await pool.query(
      'SELECT id FROM tags WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }

    const [tasks] = await pool.query(
      'SELECT task_id FROM tags_tasks WHERE tag_id = ?',
      [id]
    );

    if (tasks.length > 0) {
      return res.status(409).json({ 
        error: 'No se puede eliminar, la etiqueta tiene tareas asociadas' 
      });
    }

    await pool.query(
      'DELETE FROM tags WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    return res.status(200).json({
      message: 'Etiqueta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar etiqueta:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  createTag,
  getTags,
  getTagById,
  updateTag,
  deleteTag
};