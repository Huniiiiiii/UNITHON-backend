const meService = require('../services/mypageService');

exports.getMine = async (req, res, next) => {
  try {
    const user = req.user;
    const data = await meService.getMyPage(user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
