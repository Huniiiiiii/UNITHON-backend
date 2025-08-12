// controllers/submitVoteController.js
const submitVoteService = require('../services/submitVoteService');
const voteService = require('../services/voteService');

exports.submitVote = async (req, res, next) => {
  try {
    const voteId = Number(req.params.id);
    const { field } = req.body;           // 'one' | 'two' | 'three'
    const userId = req.user.id;

    await submitVoteService.submitVote({ voteId, userId, field });

    // ✅ 바로 결과 조회해서 반환 (result 모드)
    const data = await voteService.getVoteView({ voteId, userId });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
