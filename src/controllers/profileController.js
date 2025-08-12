const profileService = require('../services/profileService');
const AppError = require('../utils/appError');

exports.setType = async (req, res, next) => {
  try {
    const userId = req.user.id;        // authMiddleware에서 주입
    const { type } = req.body;         // 예: "A+C"
    if (!type) throw new AppError(400, 'type is required');

    const savedType = await profileService.setType({ userId, type });
    res.json({ type: savedType });     // 🔹 type만 응답
  } catch (err) {
    next(err);
  }
};
