const express = require('express');
const router = express.Router();
const {
  createTag,
  getTags,
  getTagById,
  updateTag,
  deleteTag
} = require('../controllers/tag.controller');

router.post('/', createTag);
router.get('/', getTags);
router.get('/:id', getTagById);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

module.exports = router;