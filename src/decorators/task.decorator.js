const taskDecorator = (task) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  category: task.category_name ? {
    id: task.category_id,
    name: task.category_name
  } : null,
  tags: task.tags ? task.tags : [],
  createdAt: task.created_at,
});

const taskListDecorator = (tasks) =>
  tasks.map(taskDecorator);

module.exports = { taskDecorator, taskListDecorator };