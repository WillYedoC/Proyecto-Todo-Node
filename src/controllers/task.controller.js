const pool = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { taskDecorator} = require('../decorators/task.decorator');

const getTaskTags = async (task_id) => {
  const [tags] = await pool.query(
    `SELECT t.id, t.name 
     FROM tags t
     INNER JOIN tags_tasks tt ON t.id = tt.tag_id
     WHERE tt.task_id = ?`,
    [task_id]
  );
  return tags;
};

const getFullTask = async (task_id) => {
  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?`,
    [task_id]
  );

  if (rows.length === 0) return null;

  const task = rows[0];
  task.tags = await getTaskTags(task_id);
  return task;
};

const store = async (req, res) => {
  const { title, description, status, category_id, tag_ids } = req.body;
  const user_id = req.user.id;

  if (!title) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  const validStatus = ['pending', 'completed'];
  if (status && !validStatus.includes(status)) {
    return res.status(400).json({ error: 'El estado debe ser pending o completed' });
  }

  try {
    if (category_id) {
      const [cat] = await pool.query(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [category_id, user_id]
      );
      if (cat.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
    }

    if (tag_ids && tag_ids.length > 0) {
      const [tags] = await pool.query(
        'SELECT id FROM tags WHERE id IN (?) AND user_id = ?',
        [tag_ids, user_id]
      );
      if (tags.length !== tag_ids.length) {
        return res.status(404).json({ error: 'Una o más etiquetas no encontradas' });
      }
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO tasks (id, title, description, status, category_id, user_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, status || false, category_id || null, user_id]
    );

    if (tag_ids && tag_ids.length > 0) {
      const tagValues = tag_ids.map((tag_id) => [tag_id, id]);
      await pool.query(
        'INSERT INTO tags_tasks (tag_id, task_id) VALUES ?',
        [tagValues]
      );
    }

    const task = await getFullTask(id);

    return res.status(201).json({
      message: 'Tarea creada exitosamente',
      task: taskDecorator(task)
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al crear tarea' });
  }
};

const index = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [user_id]
    );

    const tasks = await Promise.all(
      rows.map(async (task) => {
        task.tags = await getTaskTags(task.id);
        return task;
      })
    );

    return res.status(200).json({
      tasks: rows.map(taskDecorator)
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al listar tareas' });
  }
};

const show = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = await getFullTask(id);

    return res.status(200).json({
      task: taskDecorator(task)
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener tarea' });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { title, description, status, category_id, tag_ids } = req.body;
  const user_id = req.user.id;

  if (!title) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  const validStatus = [true, false];
  if (status && !validStatus.includes(status)) {
    return res.status(400).json({ error: 'El estado debe ser true o false' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    if (category_id) {
      const [cat] = await pool.query(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [category_id, user_id]
      );
      if (cat.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
    }

    if (tag_ids && tag_ids.length > 0) {
      const [tags] = await pool.query(
        'SELECT id FROM tags WHERE id IN (?) AND user_id = ?',
        [tag_ids, user_id]
      );
      if (tags.length !== tag_ids.length) {
        return res.status(404).json({ error: 'Una o más etiquetas no encontradas' });
      }
    }

    await pool.query(
      `UPDATE tasks 
       SET title = ?, description = ?, status = ?, category_id = ?
       WHERE id = ? AND user_id = ?`,
      [title, description || null, status || false, category_id || null, id, user_id]
    );

    await pool.query('DELETE FROM tags_tasks WHERE task_id = ?', [id]);

    if (tag_ids && tag_ids.length > 0) {
      const tagValues = tag_ids.map((tag_id) => [tag_id, id]);
      await pool.query(
        'INSERT INTO tags_tasks (tag_id, task_id) VALUES ?',
        [tagValues]
      );
    }

    const task = await getFullTask(id);

    return res.status(200).json({
      message: 'Tarea actualizada exitosamente',
      task: taskDecorator(task)
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar tarea' });
  }
};

const destroy = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [existing] = await pool.query(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    await pool.query('DELETE FROM tags_tasks WHERE task_id = ?', [id]);

    await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    return res.status(200).json({
      message: 'Tarea eliminada exitosamente'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar tarea' });
  }
};

module.exports = {
  store,
  index,
  show,
  update,
  destroy
}