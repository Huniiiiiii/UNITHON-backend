const { Router } = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const profileController = require('../controllers/profileController');

const router = Router();

// POST /profile/type  { "type": "A+C" }
router.post('/type', authMiddleware, profileController.setType);

module.exports = router;
