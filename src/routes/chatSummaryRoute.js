// src/routes/chatSummaryRoute.js
const express = require('express');
const router = express.Router();

const auth = require('../middlewares/authMiddleware'); // 토큰→req.user.id 세팅
const chatSummaryController = require('../controllers/chatSummaryController');

// GET /chat-summary?date=2025-08-12
router.get('/', auth, chatSummaryController.getSummaryByDate);

module.exports = router;
