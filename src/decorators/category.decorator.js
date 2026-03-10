const categoryDecorator = (category) => ({
  id: category.id,
  name: category.name,
  createdAt: category.created_at,
});

const categoryListDecorator = (categories) => 
  categories.map(categoryDecorator);

module.exports = { categoryDecorator, categoryListDecorator };