// src/services/qnaService.js
const OpenAI = require('openai');
const { supabaseAdmin } = require('../config/supabaseClient');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ROOMS = new Map();              // roomId -> { messages: [], userId, isPro, model, turns }
const FREE_TURN_LIMIT = 15;           // 무료 버전 턴 제한

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status || 500;
  }
}

/** 응답에서 JSON 추출(코드블록/잡텍스트 방어) */
function extractJson(raw) {
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : raw.trim();
  const s = body.indexOf('{'), e = body.lastIndexOf('}');
  if (s === -1 || e === -1 || e <= s) return null;
  try { return JSON.parse(body.slice(s, e + 1)); } catch { return null; }
}

/** 임시 시스템 프롬포트(변수 없음) — JSON 출력 강제 */
function buildChatbotSystemPrompt() {
  return `반드시 JSON으로만 출력한다.
1.	친한 친구처럼 자연스럽고 편하게 말하기 (3~5년 이상 친한 친구와 수다 떠는 느낌)
	2.	연애와 인간관계 관련 질문에만 답하기
	3.	모르는 건 절대 추측하지 않고 질문하기
	4.	과도한 공감이나 교과서적 표현 피하기
	5.	친구랑 수다 떠는 느낌으로 짧고 직설적으로 답변하기
	6.	감정 표현은 자연스럽고 진심 어린 톤으로, 과장하지 않기 (예: “오~” 정도)
	7.	중요한 부분은 자연스럽게 볼드 처리하듯 강조하기
	8.	상대방을 친근하게 부르기
	9.	대화 맥락이 부족하면 적극적으로 추가 정보 요청하기
	10.	썸 부정적인 신호가 명확하면 돌려 말하지 않기
	11.	감정적으로 너무 휘둘리지 말고 현실적인 관점 유지하기
    {"text" : "대화 응답 내용"}`;
}

/** 임시 요약 프롬포트(변수 없음) — JSON 출력 강제 */
function buildChatbotSummaryPrompt() {
  return `규칙:
- 반드시 JSON 한 줄만 출력한다.
- 키는 summary, chat_feedback 두 개만 사용
- summary는 80자 이내, chat_feedback은 50자 이내

출력 형식 예시:
{"summary":"대화 요약","chat_feedback":"다음엔 이렇게 물어보면 좋아요. 톤은 부드럽게 유지하세요."}`;
}

/** 방 열기: profiles.version에 따라 모델/제한 설정 */
async function openRoom({ user }) {
  const { data: prof, error } = await supabaseAdmin
    .from('profiles')
    .select('version')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new AppError(500, 'Failed to load profile');
  if (!prof) throw new AppError(400, 'Profile not found for this user');

  const isPro = !!prof.version;                       // true => 유료, false => 무료
  const model = isPro ? 'gpt-4o' : 'gpt-4o-mini';     // 모델 선택

  const systemMessage = buildChatbotSystemPrompt();

  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  ROOMS.set(roomId, {
    messages: [{ role: 'system', content: systemMessage }],
    userId: user.id,
    isPro,
    model,
    turns: 0
  });

  return { roomId, isPro, model };
}

/** 챗: 무료 15턴 제한 / 유료 무제한 (JSON 파싱 폴백 포함) */
async function chat({ roomId, userMessage }) {
  const state = ROOMS.get(roomId);
  if (!state) throw new AppError(404, 'Room not found');

  if (!state.isPro && state.turns >= FREE_TURN_LIMIT) {
    return {
      aiText: '무료 버전 대화 제한(15회)을 초과했어요. 유료 버전을 구매해 계속 대화해 주세요.',
      finished: true,
      turns: state.turns
    };
  }

  state.messages.push({ role: 'user', content: userMessage });

  const completion = await openai.chat.completions.create({
    model: state.model,   // gpt-4o-mini(무료) / gpt-4o(유료)
    messages: state.messages,
    temperature: 0.7,
    max_tokens: 150
  });

  const aiMessage = completion.choices[0]?.message?.content;
  if (!aiMessage) throw new AppError(500, 'No response from AI');

  // 파싱 + 폴백
  let parsed = extractJson(aiMessage);
  if (!parsed) { try { parsed = JSON.parse(aiMessage); } catch { /* ignore */ } }

  let aiText = '';
  if (!parsed || typeof parsed !== 'object' || typeof parsed.text !== 'string') {
    const fallback = aiMessage.trim().replace(/\s+/g, ' ');
    aiText = fallback.slice(0, 40);        // 40자 제한
    parsed = { text: aiText };
  } else {
    aiText = (parsed.text || '').slice(0, 40);
  }

  // 저장은 일관되게 JSON 문자열로
  state.messages.push({ role: 'assistant', content: JSON.stringify(parsed) });

  state.turns += 1;
  const reachedLimit = !state.isPro && state.turns >= FREE_TURN_LIMIT;

  return {
    aiText,
    finished: reachedLimit,
    turns: state.turns
  };
}

/** 요약 실행 → DB(chat_summary) 저장 → 방 삭제 (JSON 파싱 폴백 포함) */
async function summarizeNow({ roomId }) {
  const state = ROOMS.get(roomId);
  if (!state) throw new AppError(404, 'Room not found');

  const summaryPrompt = buildChatbotSummaryPrompt();

  const completion = await openai.chat.completions.create({
    model: state.model,  // 무료: gpt-4o-mini / 유료: gpt-4o
    messages: [
      { role: 'system', content: summaryPrompt },
      ...state.messages.filter(m => m.role !== 'system')
    ],
    temperature: 0.5,
    max_tokens: 300
  });

  const content = completion.choices[0]?.message?.content || '';

  // 파싱 + 폴백
  let parsed = extractJson(content);
  if (!parsed) { try { parsed = JSON.parse(content); } catch { /* ignore */ } }

  let summary = '';
  let chat_feedback = '';
  if (!parsed || typeof parsed !== 'object') {
    const clean = content.trim().replace(/\s+/g, ' ');
    const sentences = clean.split(/(?<=[.?!])\s+/).slice(0, 5);
    summary = sentences.slice(0, 3).join(' ').slice(0, 300);
    chat_feedback = sentences.slice(3, 5).join(' ').slice(0, 200) || '다음엔 한 문장으로 부드럽게 되물어보세요.';
  } else {
    summary = typeof parsed.summary === 'string' ? parsed.summary : '';
    chat_feedback = typeof parsed.chat_feedback === 'string' ? parsed.chat_feedback : '';
  }

  const { data, error } = await supabaseAdmin
    .from('chat_summary')
    .insert({
      user_id: state.userId,
      summary,
      chat_feedback,
      created_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw new AppError(500, 'Failed to save chat summary');

  // 저장 성공 시 방 종료
  ROOMS.delete(roomId);

  return { ok: true, id: data.id };
}

/** 방 강제 종료(운영용) */
async function closeRoom({ roomId }) {
  const existed = ROOMS.delete(roomId);
  return { closed: existed };
}

module.exports = {
  openRoom,
  chat,
  summarizeNow,
  closeRoom,
};
