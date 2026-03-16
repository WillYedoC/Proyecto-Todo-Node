const categoryDecorator = (category) => ({
  id: category.id,
  name: category.name,
  createdAt: category.created_at,
});

module.exports = { categoryDecorator};