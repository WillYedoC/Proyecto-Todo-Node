const taskDecorator = (task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  is_completed: task.is_completed,
  category: task.category_name ? {
    id: task.category_id,
    name: task.category_name
  } : null,
  tags: task.tags ? task.tags : [],
  createdAt: task.created_at,
});

module.exports = { taskDecorator};