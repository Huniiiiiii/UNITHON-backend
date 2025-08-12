// src/services/summaryQueryService.js
const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

/**
 * 가장 최근 요약 1건 조회
 * @param {object} params
 * @param {string} params.userId  - 인증 미들웨어에서 온 사용자 ID
 * @param {string} params.scenarioId - 시나리오 ID (예: "4-1")
 * @returns {Promise<object>} { scenarioId, created_at, feedback, flow_tip, special_recommendation[] }
 */
exports.getLatestSummary = async ({ userId, scenarioId }) => {
  if (!userId) throw new AppError(401, 'Unauthorized: userId missing');
  if (!scenarioId) throw new AppError(400, 'scenarioId is required');

  const { data, error } = await supabaseAdmin
    .from('scenario_summary')
    .select(
      'id, user_id, scenario_id, feedback, flow_tip, special_recommendation, created_at'
    )
    .eq('user_id', userId)
    .eq('scenario_id', scenarioId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError(500, 'Failed to load summary');
  if (!data) throw new AppError(404, 'Summary not found');

  let recs = [];
  try {
    // DB에는 문자열로 저장되어 있음 → 배열로 파싱
    recs = JSON.parse(data.special_recommendation || '[]');
  } catch {
    recs = [];
  }

  return {
    scenarioId: data.scenario_id,
    created_at: data.created_at,
    feedback: data.feedback || '',
    flow_tip: data.flow_tip || '',
    special_recommendation: Array.isArray(recs) ? recs : [],
  };
};
