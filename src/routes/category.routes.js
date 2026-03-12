const express = require('express');
const router = express.Router();
const {
  store,
  index,
  show,
  update,
  destroy
} = require('../controllers/category.controller');

router.post('/', store);
router.get('/', index);
router.get('/:id', show);
router.put('/:id', update);
router.delete('/:id', destroy);

module.exports = router;