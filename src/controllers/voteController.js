const votesService = require('../services/voteService');
const AppError = require('../utils/appError');

exports.getView = async (req, res, next) => {
  try {
    const voteId = Number(req.params.id);
    if (!Number.isFinite(voteId) || voteId < 1) {
      throw new AppError(400, 'vote_id must be a positive number');
    }
    const userId = req.user.id;
    const data = await votesService.getVoteView({ voteId, userId });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
