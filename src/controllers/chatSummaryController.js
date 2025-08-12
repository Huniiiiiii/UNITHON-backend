// src/controllers/chatSummaryController.js
const summaryQueryService = require('../services/summaryQueryService');
const AppError = require('../utils/appError');

exports.getSummaryByDate = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) throw new AppError(401, 'Unauthorized');
    const userId = req.user.id;
    const { date } = req.query; // YYYY-MM-DD

    const summaries = await summaryQueryService.getSummaryByDate({ userId, date });
    res.json(summaries);
  } catch (err) {
    next(err);
  }
};
