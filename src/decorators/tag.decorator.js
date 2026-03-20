const tagDecorator = (tag) => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  createdAt: tag.created_at,
});

module.exports = { tagDecorator};