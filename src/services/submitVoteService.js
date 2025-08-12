const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.submitVote = async ({ voteId, userId, field }) => {
  const vId = Number(voteId);
  if (!['one', 'two', 'three'].includes(field)) {
    throw new AppError(400, 'field must be one|two|three');
  }

  // 1) 중복 투표 확인
  const { data: exists } = await supabaseAdmin
    .from('vote_user')
    .select('id')
    .eq('vote_id', vId)
    .eq('user_id', userId)
    .maybeSingle();
  if (exists) throw new AppError(409, 'Already voted');

  // 2) 현재 집계 읽기
  const { data: vt, error: vtErr } = await supabaseAdmin
    .from('vote_total')
    .select('total, one, two, three')
    .eq('id', vId)
    .single();
  if (vtErr) throw new AppError(500, vtErr.message);

  // 3) vote_user 저장 → "one", "two", "three" 그대로 저장
  const { error: insErr } = await supabaseAdmin
    .from('vote_user')
    .insert([{ vote_id: vId, user_id: userId, user_select: field }]);
  if (insErr) throw new AppError(500, insErr.message);

  // 4) vote_total 업데이트
  const next = {
    total: (vt.total || 0) + 1,
    one: field === 'one' ? (vt.one || 0) + 1 : vt.one,
    two: field === 'two' ? (vt.two || 0) + 1 : vt.two,
    three: field === 'three' ? (vt.three || 0) + 1 : vt.three
  };
  const { error: updErr } = await supabaseAdmin
    .from('vote_total')
    .update(next)
    .eq('id', vId);
  if (updErr) throw new AppError(500, updErr.message);

  return { message: 'Vote submitted successfully' };
};
