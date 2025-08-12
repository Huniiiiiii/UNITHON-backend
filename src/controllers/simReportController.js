// src/controllers/simSummaryController.js
const summaryQueryService = require('../services/simReportService');
const AppError = require('../utils/appError');

exports.getSummaryByDate = async (req, res, next) => {
  try {
    const userId = req.user?.id; // authMiddleware에서 주입
    const date = req.query.date; // YYYY-MM-DD 형식

    if (!date) throw new AppError(400, 'date query is required');

    const summary = await summaryQueryService.getSummaryByDate({
      userId,
      date
    });

    res.json(summary);
  } catch (err) {
    next(err);
  }
};
