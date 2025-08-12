const svc = require('../services/simThreadService');

exports.open = async (req, res, next) => {
  try {
    const { scenarioId } = req.body;
    const out = await svc.openRoom({ user: req.user, scenarioId });
    res.json(out);
  } catch (err) { next(err); }
};

exports.chat = async (req, res, next) => {
  try {
    const { roomId, userMessage } = req.body;
    const out = await svc.chat({ roomId, userMessage });
    res.json(out);
  } catch (err) { next(err); }
};

exports.summarizeNow = async (req, res, next) => {
  try {
    const { roomId } = req.body; // 또는 params로 받아도 됨
    const out = await svc.summarizeNow({ roomId });
    res.json(out);
  } catch (err) { next(err); }
};
