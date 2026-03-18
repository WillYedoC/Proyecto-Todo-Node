const pool = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const { taskDecorator} = require('../decorators/task.decorator');

const getTaskTags = async (task_id) => {
  const [tags] = await pool.query(
    `SELECT t.id, t.name, t.color
     FROM tags t
     INNER JOIN tags_tasks tt ON t.id = tt.tag_id
     WHERE tt.task_id = ?`,
    [task_id],
  );

  return tags;
};

const getFullTask = async (task_id) => {
  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?`,
    [task_id],
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
    return res.status(400).json({ error: "El título es requerido" });
  }

  try {
    if (category_id) {
      const [cat] = await pool.query(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        [category_id, user_id],
      );

      if (cat.length === 0) {
        return res.status(404).json({ error: "Categoría no encontrada" });
      }
    }

    const tag_ids = tags || [];

    if (tag_ids.length > 0) {
      const [foundTags] = await pool.query(
        "SELECT id FROM tags WHERE id IN (?) AND user_id = ?",
        [tag_ids, user_id],
      );

      if (foundTags.length !== tag_ids.length) {
        return res.status(404).json({
          error: "Una o más etiquetas no encontradas",
        });
      }
    }

    const id = uuidv4();

    await pool.query(
      `INSERT INTO tasks (id, title, description, is_completed, category_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        description || null,
        is_completed || false,
        category_id || null,
        user_id,
      ],
    );

    if (tag_ids.length > 0) {
      const tagValues = tag_ids.map((tag_id) => [tag_id, id]);

      await pool.query("INSERT INTO tags_tasks (tag_id, task_id) VALUES ?", [
        tagValues,
      ]);
    }

    const task = await getFullTask(id);

    return res.status(201).json({
      message: "Tarea creada exitosamente",
      task: taskDecorator(task),
    });
  } catch (error) {
    return res.status(500).json({
      error: `Error al crear tarea ${error.message}`,
    });
  }
};

const index = async (req, res) => {
  const user_id = req.user.id;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 9);
  const offset = (page - 1) * per_page;

  const filter = req.query.filter || "all";

  let filterClause = "";
  if (filter === "completed") filterClause = " AND t.is_completed = 1";
  if (filter === "pending") filterClause = " AND t.is_completed = 0";

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM tasks t
       WHERE t.user_id = ? ${filterClause}`,
      [user_id],
    );

    const [rows] = await pool.query(
      `SELECT 
        t.*,
        c.name AS category_name,
        tg.id AS tag_id,
        tg.name AS tag_name,
        tg.color AS tag_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN tags_tasks tt ON t.id = tt.task_id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      WHERE t.user_id = ? ${filterClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?`,
      [user_id, per_page, offset],
    );

    const taskMap = {};

    rows.forEach((row) => {
      if (!taskMap[row.id]) {
        taskMap[row.id] = {
          id: row.id,
          title: row.title,
          description: row.description,
          is_completed: row.is_completed,
          category_id: row.category_id,
          category_name: row.category_name,
          created_at: row.created_at,
          tags: [],
        };
      }

      if (row.tag_id) {
        taskMap[row.id].tags.push({
          id: row.tag_id,
          name: row.tag_name,
          color: row.tag_color,
        });
      }
    });

    const tasks = Object.values(taskMap);

    const last_page = Math.ceil(total / per_page) || 1;

    return res.status(200).json({
      data: rows.map(taskDecorator),
      total,
      per_page,
      current_page: page,
      last_page,
    });
  } catch (error) {
    return res.status(500).json({ error: `Error al listar tareas: ${error.message}` });
  }
};

const show = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [rows] = await pool.query(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    const task = await getFullTask(id);

    return res.status(200).json({
      task: taskDecorator(task),
    });
  } catch (error) {
    return res.status(500).json({
      error: `Error al obtener tarea: ${error.message}`,
    });
  }
};

const update = async (req, res) => {
  const { id } = req.params;
  const { title, description, is_completed, category_id, tags } = req.body;
  const user_id = req.user.id;

  if (!title) {
    return res.status(400).json({
      error: "El título es requerido",
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    if (category_id) {
      const [cat] = await pool.query(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        [category_id, user_id],
      );

      if (cat.length === 0) {
        return res.status(404).json({
          error: "Categoría no encontrada",
        });
      }
    }

    const tag_ids = tags || [];

    if (tag_ids.length > 0) {
      const [foundTags] = await pool.query(
        "SELECT id FROM tags WHERE id IN (?) AND user_id = ?",
        [tag_ids, user_id],
      );

      if (foundTags.length !== tag_ids.length) {
        return res.status(404).json({
          error: "Una o más etiquetas no encontradas",
        });
      }
    }

    await pool.query(
      `UPDATE tasks
       SET title = ?, description = ?, is_completed = ?, category_id = ?
       WHERE id = ? AND user_id = ?`,
      [
        title,
        description || null,
        is_completed || false,
        category_id || null,
        id,
        user_id,
      ],
    );

    await pool.query("DELETE FROM tags_tasks WHERE task_id = ?", [id]);

    if (tag_ids.length > 0) {
      const tagValues = tag_ids.map((tag_id) => [tag_id, id]);

      await pool.query("INSERT INTO tags_tasks (tag_id, task_id) VALUES ?", [
        tagValues,
      ]);
    }

    const task = await getFullTask(id);

    return res.status(200).json({
      message: "Tarea actualizada exitosamente",
      task: taskDecorator(task),
    });
  } catch (error) {

    return res.status(500).json({
      error: `Error al actulizar tarea: ${error.message}`,
    });
  }
};

const destroy = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [existing] = await pool.query(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    await pool.query("DELETE FROM tags_tasks WHERE task_id = ?", [id]);

    await pool.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [
      id,
      user_id,
    ]);

    return res.status(200).json({
      message: "Tarea eliminada exitosamente",
    });
  } catch (error) {
    return res.status(500).json({
      error: `Error al eliminar tarea: ${error.message}`,
    });
  }
};

module.exports = {
  store,
  index,
  show,
  update,
  destroy
}
