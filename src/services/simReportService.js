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

  const { data, error } = await supabaseAdmin
    .from('scenario_summary')
    .select('scenario_id, feedback, flow_tip, special_recommendation, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'Failed to load summary');

  return (data || []).map((item) => {
    // special_recommendation JSON 문자열 → 배열 변환
    let recs = [];
    try {
      recs = JSON.parse(item.special_recommendation || '[]');
    } catch { /* ignore */ }

    // 시나리오 텍스트 매칭
    const scenarioText = SCENARIO_TEXT_MAP.get(item.scenario_id) || '';

    return {
      scenarioId: item.scenario_id,
      scenario: scenarioText,          // ← 추가된 필드
      created_at: item.created_at,
      feedback: item.feedback || '',
      flow_tip: item.flow_tip || '',
      special_recommendation: Array.isArray(recs) ? recs : []
    };
  });
};
