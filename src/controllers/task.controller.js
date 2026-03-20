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
  const user_id = req.user.id;

  const {
    title,
    description = null,
    is_completed = false,
    category_id,
    tags = []
  } = req.body;

  try {
    if (!title || typeof title !== "string") {
      return res.status(400).json({
        error: "El título es obligatorio"
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        error: "El título no puede exceder 255 caracteres"
      });
    }

    if (category_id) {
      const [category] = await pool.query(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        [category_id, user_id]
      );

      if (category.length === 0) {
        return res.status(404).json({
          error: "La categoría seleccionada no existe o no te pertenece"
        });
      }
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: "Las etiquetas deben ser un array"
      });
    }

    if (tags.length > 0) {
      const [foundTags] = await pool.query(
        "SELECT id FROM tags WHERE id IN (?) AND user_id = ?",
        [tags, user_id]
      );

      if (foundTags.length !== tags.length) {
        return res.status(404).json({
          error: "Una o más etiquetas no existen o no te pertenecen"
        });
      }
    }

    const id = uuidv4();

    await pool.query(
      `INSERT INTO tasks (id, title, description, is_completed, category_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, description, is_completed, category_id || null, user_id]
    );
    if (tags.length > 0) {
      const tagValues = tags.map(tag_id => [tag_id, id]);

      await pool.query(
        "INSERT INTO tags_tasks (tag_id, task_id) VALUES ?",
        [tagValues]
      );
    }
    const task = await getFullTask(id);

    return res.status(201).json({
      message: "Tarea creada exitosamente",
      data: taskDecorator(task)
    });
  } catch (error) {
    console.error("Error al crear tarea:", error.message);
    return res.status(500).json({
      error: "Error interno del servidor"
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
      data: tasks.map(taskDecorator),
      total,
      per_page,
      current_page: page,
      last_page,
    });

  } catch (error) {
    return res.status(500).json({
      error: `Error al listar tareas: ${error.message}`,
    });
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
  const user_id = req.user.id;

  const {
    title,
    description,
    is_completed,
    category_id,
    tags
  } = req.body;
  console.log(    title,
    description,
    is_completed,
    category_id,
    tags);
  try {
    const [existing] = await pool.query(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      [id, user_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: "Tarea no encontrada",
      });
    }

    if (title !== undefined) {
      if (!title || typeof title !== "string") {
        return res.status(400).json({
          error: "El título es obligatorio",
        });
      }

      if (title.length > 255) {
        return res.status(400).json({
          error: "El título no puede exceder 255 caracteres",
        });
      }
    }

    if (category_id !== undefined && category_id !== null) {
      const [cat] = await pool.query(
        "SELECT id FROM categories WHERE id = ? AND user_id = ?",
        [category_id, user_id]
      );

      if (cat.length === 0) {
        return res.status(404).json({
          error: "La categoría seleccionada no existe o no te pertenece",
        });
      }
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({
          error: "Las etiquetas deben ser un array",
        });
      }

      if (tags.length > 0) {
        const [foundTags] = await pool.query(
          "SELECT id FROM tags WHERE id IN (?) AND user_id = ?",
          [tags, user_id]
        );

        if (foundTags.length !== tags.length) {
          return res.status(404).json({
            error: "Una o más etiquetas no existen o no te pertenecen",
          });
        }
      }
    }

    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(title);
    }

    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }

    if (is_completed !== undefined) {
      fields.push("is_completed = ?");
      values.push(is_completed);
    }

    if (category_id !== undefined) {
      fields.push("category_id = ?");
      values.push(category_id);
    }

    if (fields.length > 0) {
      await pool.query(
        `UPDATE tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
        [...values, id, user_id]
      );
    }

    if (tags !== undefined) {
      await pool.query("DELETE FROM tags_tasks WHERE task_id = ?", [id]);

      if (tags.length > 0) {
        const tagValues = tags.map(tag_id => [tag_id, id]);

        await pool.query(
          "INSERT INTO tags_tasks (tag_id, task_id) VALUES ?",
          [tagValues]
        );
      }
    }

    const task = await getFullTask(id);

    return res.status(200).json({
      message: "Tarea actualizada exitosamente",
      data: taskDecorator(task),
    });

  } catch (error) {
    console.error("Error al actualizar tarea:", error.message);

    return res.status(500).json({
      error: "Error interno del servidor",
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
