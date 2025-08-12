// src/routes/qnaRoute.js
const express = require('express');
const auth = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/qnaController');

const router = express.Router();

// 방 열기 (GET 허용)
router.get('/open', auth, ctrl.open);

// 대화
router.post('/chat', auth, ctrl.chat);

// 대화 종료 → 요약 생성 & DB 저장 (별도 API)
router.post('/summary', auth, ctrl.summarizeNow);

// (옵션) 방 강제 종료
router.post('/close', auth, ctrl.close);

module.exports = router;
