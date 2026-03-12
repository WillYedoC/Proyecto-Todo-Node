const tagDecorator = (tag) => ({
  id: tag.id,
  name: tag.name,
  createdAt: tag.created_at,
});

module.exports = { tagDecorator};