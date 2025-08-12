// src/services/summaryQueryService.js
const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const scenarios = require('../data/scenarios.json');

// ---- 시나리오 빠른 조회용 맵 구성: { "5-10": "학교 앞 골목길..." } ----
const SCENARIO_TEXT_MAP = (() => {
  const map = new Map();
  if (Array.isArray(scenarios)) {
    for (const it of scenarios) {
      if (it && typeof it.id === 'string') {
        map.set(it.id, it.scenario || '');
      }
    }
  }
  return map;
})();

/**
 * 특정 날짜의 summary 조회 (+ 시나리오 텍스트 포함)
 * @param {string} userId
 * @param {string} date - YYYY-MM-DD
 */
exports.getSummaryByDate = async ({ userId, date }) => {
  if (!userId) throw new AppError(401, 'Unauthorized');
  if (!date) throw new AppError(400, 'date is required');

  // 변환 제거: date 그대로 사용
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  const { data, error } = await supabaseAdmin
    .from('scenario_summary')
    .select('scenario_id, feedback, flow_tip, special_recommendation, created_at')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load summary');

  return (data || []).map((item) => {
    let recs = [];
    try {
      recs = JSON.parse(item.special_recommendation || '[]');
    } catch {}

    return {
      scenarioId: item.scenario_id,
      scenario: '', // 시나리오 텍스트 매핑 로직은 필요시 추가
      created_at: item.created_at,
      feedback: item.feedback || '',
      flow_tip: item.flow_tip || '',
      special_recommendation: Array.isArray(recs) ? recs : []
    };
  });
};
