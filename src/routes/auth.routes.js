const express = require('express');
const router = express.Router();
const { login, profile } = require('../controllers/auth.controller');
const authMiddleware = require("../middlewares/auth.middleware");

router.post('/login', login);

router.get('/profile', authMiddleware, profile);

module.exports = router;