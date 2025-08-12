// src/routes/simSummaryRoute.js
const express = require('express');
const router = express.Router();
const { getSummaryByDate } = require('../controllers/simReportController');
const authMiddleware = require('../middlewares/authMiddleware'); // 토큰에서 userId 추출

router.get('/sim', authMiddleware, getSummaryByDate);

module.exports = router;
