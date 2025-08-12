const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const meController = require('../controllers/mypageController');

const router = Router();
router.get('/me', authMiddleware, meController.getMine);

module.exports = router;
