const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

// 정수 퍼센트 계산 (0~100)
const toPercent = (n, total) => {
  const safeTotal = Number(total) || 0;
  const safeN = Number(n) || 0;
  if (safeTotal <= 0) return 0;
  return Math.round((safeN / safeTotal) * 100);
};

/**
 * voteId(= vote_total.id)와 userId로
 * - 이미 투표했다면: result 모드 (vote_text + 퍼센트 + 내 선택)
 * - 안 했다면: question 모드 (vote_text만)
 */
exports.getVoteView = async ({ voteId, userId }) => {
  // 1) vote_total 로드: vote_text(jsonb) + 집계 수치
  const { data: vt, error: vtErr } = await supabaseAdmin
    .from('vote_total')
    .select('id, vote_text, total, one, two, three')
    .eq('id', Number(voteId))  // 입력받은 vote_id와 DB id 비교
    .single();

  if (vtErr) {
    if (vtErr.code === 'PGRST116') throw new AppError(404, 'Vote not found');
    throw new AppError(500, vtErr.message);
  }

  // 2) 사용자가 이미 투표했는지 확인
  const { data: my, error: myErr } = await supabaseAdmin
    .from('vote_user')
    .select('user_select')
    .eq('vote_id', vt.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (myErr) throw new AppError(500, myErr.message);

  // 3) 분기 처리
  if (my) {
    const total = Number(vt.total) || 0;
    const one = Number(vt.one) || 0;
    const two = Number(vt.two) || 0;
    const three = Number(vt.three) || 0;

    return {
      mode: 'result',
      voteId: vt.id,
      voteText: vt.vote_text, // jsonb 그대로
      myChoice: my.user_select,    // 1 | 2 | 3
      percentages: {
        one: toPercent(one, total),
        two: toPercent(two, total),
        three: toPercent(three, total)
      }
    };
  }

  // 미투표: 질문만
  return {
    mode: 'question',
    voteId: vt.id,
    voteText: vt.vote_text
  };
};
