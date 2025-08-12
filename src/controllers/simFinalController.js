// src/controllers/summaryQueryController.js
const svc = require('../services/simFinalService');

exports.getLatest = async (req, res, next) => {
  try {
    const scenarioId = req.query.scenarioId || req.body?.scenarioId; // GET 쿼리 우선
    const out = await svc.getLatestSummary({
      userId: req.user?.id,
      scenarioId,
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
};
