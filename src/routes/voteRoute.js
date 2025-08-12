// src/routes/vote.route.js
const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const voteController = require('../controllers/voteController');
const submitVoteController = require('../controllers/submitVoteController');

const router = Router();

// GET /api/votes/:id  → 컨트롤러 사용
router.get('/:id', authMiddleware, voteController.getView);

// POST /api/votes/submit/:id
router.post('/submit/:id', authMiddleware, submitVoteController.submitVote);

module.exports = router;
