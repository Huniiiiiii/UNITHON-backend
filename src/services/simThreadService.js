// src/services/simThreadService.js
const OpenAI = require('openai');
const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const typeSet = require('../data/typeSet.json');
const scenarios = require('../data/scenarios.json');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROOMS = new Map();
const MAX_TURNS = 3;

/** 시나리오 텍스트 */
function ensureScenario(scenarioId) {
  const s = Array.isArray(scenarios) ? scenarios.find(i => i.id === scenarioId) : null;
  if (!s) throw new AppError(400, `Unknown scenarioId: ${scenarioId}`);
  return s.scenario;
}

/** 응답에서 JSON 뽑기(코드펜스/잡텍스트 방어) */
function extractJson(raw) {
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : raw.trim();
  const s = body.indexOf('{'), e = body.lastIndexOf('}');
  if (s === -1 || e === -1 || e <= s) return null;
  try { return JSON.parse(body.slice(s, e + 1)); } catch { return null; }
}

/** 요약 스키마 강제 */
function normalizeSummary(obj = {}) {
  let feedback = obj.feedback;
  if (typeof feedback === 'object' && feedback) feedback = Object.values(feedback).join(' ');
  if (typeof feedback !== 'string') feedback = '';
  let flow_tip = obj.flow_tip;
  if (typeof flow_tip !== 'string') flow_tip = '';
  let special_recommendation = Array.isArray(obj.special_recommendation) ? obj.special_recommendation : [];
  special_recommendation = special_recommendation.filter(v => typeof v === 'string').slice(0, 2);
  return { feedback, flow_tip, special_recommendation };
}

/** 시뮬 프롬프트 */
function buildSimulationPrompt({ scenarioText, userSex, typeInfo, typeLabel }) {
  return `너의 역할: 연애 커뮤니케이션 시뮬레이터 속 감정 코치이자 시뮬레이션 상대역을 겸함.

목표: 사용자가 자연스럽게 말문을 잇게 만들고, 대화의 리듬을 유지하도록 짧고 또렷한 리드/받아치기를 제공.

사용자가 AI와 나눈 연애 시뮬레이션 대화를 분석하고 말투, 감정 표현, 흐름 등을 평가해
실전 상황에서 더 자연스럽게 대화할 수 있도록 도와주는 역할이야.

대화 응답은 한국어 기준으로 최대 40자 이내로 작성해야 해.
마지막 요약의 경우는 최대 100자 이내로 작성해야 해

상대방이 짧게 말하면 너도 짧게 반응하고 길게 말땐 자연스럽게 맞춰줘.
지나치게 설명하거나 혼자 감정을 과하게 덧붙이지 말고 대화의 흐름과 리듬에 맞춰 이어지도록 대화를 이끌어줘.

IMPORTANT:
주의사항
- 사용자의 발화가 거칠거나 부적절하더라도, 직접적인 비난은 하지 마.
- 직접적인 말보다는 "해당 표현은 조금 부담스러워요" 와 같이 간접적으로 말해줘
- 대화 중에는 절대 피드백하지마 나중에 피드백을 따로 할거야
- 말투는 대화에 흐름에 잘 맞게 하고, 훈계조 금지!
- 모든 응답은 이모티콘 없이 작성해줘. 텍스트로만 감정과 분위기를 표현해줘
- 사용자 성향 정보는 참고용이야. 실제 발화 내용이 성향 정보와 다를 경우 대화 내용을 우선으로 판단해.
- 절대 지켜야 할 조건
- 응답 형식 조건
- 요약을 제외한 AI가 응답할 차례일 경우에만, 응답은 반드시 아래 JSON 형식으로 출력한다:
{
"text": "여기에 대답을 자연스럽게 작성해줘"
}

시나리오 정보 및 사용자 정보:

- 상황: ${scenarioText}
- 사용자 성별: ${userSex}
- 사용자 성향:
{
"type":"${typeLabel}",
"emotionExpression": "${typeInfo.emotionExpression}",
"communicationTone": "${typeInfo.communicationTone}",
"relationshipDrive": "${typeInfo.relationshipDrive}"
}`;
}

/** 요약 프롬프트 */
function buildSummaryPrompt({ scenarioText, userSex, typeInfo, typeLabel }) {
  return `시나리오 정보 및 사용자 정보:

- 상황: ${scenarioText}
- 사용자 성별: ${userSex}
- 사용자 성향:
{
"type":"${typeLabel}",
"emotionExpression": "${typeInfo.emotionExpression}",
"communicationTone": "${typeInfo.communicationTone}",
"relationshipDrive": "${typeInfo.relationshipDrive}"
}

IMPORTANT:

요청사항:
- 전체 대화 흐름을 분석해, 각 사용자의 대화가 어떤 영향을 주었는지 설명해줘.
- 상대방이 어떤 감정을 느꼈을지 추측해 설명해줘.
- 더 자연스럽게 만드는 대화 팁을 flow_tip으로 알려줘. 무조건 user의 응답이 더 자연스러워지는 팁으로.
- 마지막에는 special_recommendation 아래, user가 다음 상황에서 쓸 수 있는 한 줄 응답 2개를 배열로 제시해줘.
- 모든 응답은 이모티콘 없이, 반드시 JSON 형식만 출력.

반드시 아래 스키마로만 출력:
{
  "feedback": "분석 내용및 피드백",
  "flow_tip": "처음에 이렇게 말했다면 ... 대화를 이어가는 팁",
  "special_recommendation": [
    "문장1",
    "문장2"
  ]
}`;
}

/** 방 열기 */
exports.openRoom = async ({ user, scenarioId }) => {
  const scenarioText = ensureScenario(scenarioId);

  const { data: prof, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('sex, type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profErr) throw new AppError(500, 'Failed to load profile');
  if (!prof) throw new AppError(400, 'Profile not found for this user');

  const typeLabel = (prof.type || '').toString().toUpperCase().replace(/\s+/g, '');
  const typeInfo = Array.isArray(typeSet) ? typeSet.find(i => i.type === typeLabel) : null;
  if (!typeInfo) throw new AppError(400, `Unknown type in profile: ${typeLabel}`);

  const systemMessage = buildSimulationPrompt({
    scenarioText,
    userSex: prof.sex || '',
    typeInfo,
    typeLabel
  });

  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  ROOMS.set(roomId, {
    messages: [{ role: 'system', content: systemMessage }],
    userId: user.id,
    scenarioId,
    turns: 0,
    typeInfo,
    typeLabel,
    scenarioText,
    userSex: prof.sex || ''
  });

  return { roomId };
};

/** 대화: 마지막 턴이면 응답 먼저, 요약은 백그라운드로 자동 수행 */
exports.chat = async ({ roomId, userMessage }) => {
  const state = ROOMS.get(roomId);
  if (!state) throw new AppError(404, 'Room not found');

  if (state.turns >= MAX_TURNS) {
    return { finished: true, aiText: null };
  }

  try {
    state.messages.push({ role: 'user', content: userMessage });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: state.messages,
      temperature: 0.7,
      max_tokens: 150
    });

    const aiMessage = completion.choices[0]?.message?.content;
    if (!aiMessage) throw new AppError(500, 'No response from AI');

    const parsed = extractJson(aiMessage) ?? (() => { try { return JSON.parse(aiMessage); } catch { return null; } })();
    if (!parsed || typeof parsed !== 'object') throw new AppError(500, 'AI 응답 JSON 파싱 실패');

    const aiText = parsed.text || '';
    state.messages.push({ role: 'assistant', content: aiMessage });
    state.turns += 1;

    if (state.turns >= MAX_TURNS) {
      const res = { aiText, finished: true, turns: state.turns };

      // ✅ 자동 요약: 백그라운드에서 실행 → DB 저장 → 성공 시 방 삭제
      setImmediate(async () => {
        try {
          await runSummaryAndPersist(roomId);
        } catch (e) {
          console.error('Background summarize failed:', e);
          // 실패 시 방 유지(필요하면 재시도 API로 돌릴 수 있음)
        }
      });

      return res;
    }

    return { aiText, finished: false, turns: state.turns };
  } catch (err) {
    console.error('Error during chat:', err);
    throw new AppError(500, 'Failed to get AI response');
  }
};

/** 요약 실행 + DB 저장 + 성공 시 방 삭제 */
async function runSummaryAndPersist(roomId) {
  const state = ROOMS.get(roomId);
  if (!state) throw new AppError(404, 'Room not found');

  const summaryPrompt = buildSummaryPrompt({
    scenarioText: state.scenarioText,
    userSex: state.userSex,
    typeInfo: state.typeInfo,
    typeLabel: state.typeLabel
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: summaryPrompt },
      ...state.messages.filter(m => m.role !== 'system')
    ],
    temperature: 0.5
  });

  const summaryMessage = completion.choices[0]?.message?.content;
  if (!summaryMessage) throw new Error('No summary response from AI');

  const parsed = extractJson(summaryMessage) ?? (() => { try { return JSON.parse(summaryMessage); } catch { return null; } })();
  if (!parsed || typeof parsed !== 'object') throw new Error('요약 JSON 파싱 실패');

  const { feedback, flow_tip, special_recommendation } = normalizeSummary(parsed);

  const { error } = await supabaseAdmin
    .from('scenario_summary')
    .insert({
      user_id: state.userId,
      scenario_id: state.scenarioId,
      feedback,
      flow_tip,
      special_recommendation: JSON.stringify(special_recommendation),
      created_at: new Date().toISOString()
    });
  if (error) throw error;

  ROOMS.delete(roomId); // ✅ 성공 시 방 종료
}

/** (선택) 재시도/운영용 수동 요약 트리거 */
exports.summarizeNow = async ({ roomId }) => {
  await runSummaryAndPersist(roomId);
  return { ok: true };
};
