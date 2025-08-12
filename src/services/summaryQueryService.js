// src/services/summaryQueryService.js
const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

const KST_OFFSET = '+09:00';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

/**
 * 특정 날짜(KST)의 chat_summary 조회
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Array<{created_at:string, summary:string, chat_feedback:string}>>}
 */
exports.getSummaryByDate = async ({ userId, date }) => {
  if (!userId) throw new AppError(401, 'Unauthorized');
  if (!date) throw new AppError(400, 'date is required');
  if (!DATE_RE.test(date)) throw new AppError(400, 'date must be YYYY-MM-DD');

  // KST 기준 [당일 00:00:00 포함, 다음날 00:00:00 미만]
  const startKST = new Date(`${date}T00:00:00${KST_OFFSET}`);
  const endKST = new Date(startKST.getTime() + 24 * 60 * 60 * 1000);

  const from = startKST.toISOString(); // UTC ISO
  const to = endKST.toISOString();

  const { data, error } = await supabaseAdmin
    .from('chat_summary')
    .select('summary, chat_feedback, created_at')
    .eq('user_id', userId)
    .gte('created_at', from)
    .lt('created_at', to) // 23:59:59.999 대신 다음날 00:00 미만
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load chat summary');

  return (data || []).map(row => ({
    created_at: row.created_at,
    summary: row.summary || '',
    chat_feedback: row.chat_feedback || '',
  }));
};
