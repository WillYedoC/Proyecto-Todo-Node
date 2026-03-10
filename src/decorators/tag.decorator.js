const tagDecorator = (tag) => ({
  id: tag.id,
  name: tag.name,
  createdAt: tag.created_at,
});

const tagListDecorator = (tags) => 
  tags.map(tagDecorator);

module.exports = { tagDecorator, tagListDecorator };