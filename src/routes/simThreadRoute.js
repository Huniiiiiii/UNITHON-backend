const express = require('express');
const auth = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/simThreadController');
const summaryCtrl = require('../controllers/simFinalController');
const router = express.Router();

router.post('/open', auth, ctrl.open);
router.post('/chat', auth, ctrl.chat);
router.post('/summary', auth, ctrl.summarizeNow);
router.get('/summary/full', auth, summaryCtrl.getLatest);
module.exports = router;
