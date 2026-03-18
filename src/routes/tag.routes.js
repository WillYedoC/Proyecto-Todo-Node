const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  store,
  index,
  show,
  update,
  destroy
} = require('../controllers/tag.controller');
router.use(authMiddleware);

router.post('/', store);
router.get('/', index);
router.get('/:id', show);
router.put('/:id', update);
router.delete('/:id', destroy);

module.exports = router;