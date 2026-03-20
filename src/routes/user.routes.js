const express = require('express');
const router = express.Router();
const { createUser, profile } = require('../controllers/user.controller');
const authMiddleware = require("../middlewares/auth.middleware");

router.post('/register', createUser);
router.get('/user', authMiddleware, profile);

module.exports = router;