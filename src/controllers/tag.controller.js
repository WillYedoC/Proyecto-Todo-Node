const pool = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { tagDecorator} = require('../decorators/tag.decorator');

const store = async (req, res) => {
  const { name, color } = req.body;
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
      'INSERT INTO tags (id, name, color, user_id) VALUES (?, ?, ?, ?)',
      [id, name, color || null, user_id]
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
    return res.status(500).json({ error: `Èrror al crear etiquetas ${error.message}` });
  }
};

const index = async (req, res) => {
  const user_id = req.user.id;
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 10);
  const offset   = (page - 1) * per_page;

  try {

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM tags WHERE user_id = ?',
      [user_id]
    );

    const [rows] = await pool.query(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [user_id, per_page, offset]
    );

    const last_page = Math.ceil(total / per_page) || 1;

    return res.status(200).json({
      data: rows.map(tagDecorator),
      total,
      per_page,
      current_page: page,
      last_page,
    });

  } catch (error) {
    return res.status(500).json({ error: `Error al listar etiquetas ${error.message}` });
  }
};

const show = async (req, res) => {
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
    return res.status(500).json({ error: `Èrror al obtener etiquetas ${error.message}` });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;
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
      'UPDATE tags SET name = ?, color = ? WHERE id = ? AND user_id = ?',
      [name, color || null, id, user_id]
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
    return res.status(500).json({ error: `Error al actualizar etiquetas ${error.message}` });
  }
};

const destroy = async (req, res) => {
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
    return res.status(500).json({ error: `Error al eliminar etiqueta ${error.message}` });
  }
};

module.exports = {
  store,
  index,
  show,
  update,
  destroy
};