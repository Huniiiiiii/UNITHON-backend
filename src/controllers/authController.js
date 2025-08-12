const authService = require('../services/authService');

exports.login = async (req, res, next) => {
  try {
    const result = await authService.loginWithEmail(req.body);
    res.json({ data: result });
  } catch (err) {
    next(err); // errorMiddleware로 전달
  }
};
