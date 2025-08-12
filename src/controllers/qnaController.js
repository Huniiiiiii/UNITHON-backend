// src/controllers/qnaController.js
const svc = require('../services/qnaService');

// 방 열기 (무료/유료 판단 + 모델 선택)
// GET /sim/open
exports.open = async (req, res, next) => {
  try {
    const out = await svc.openRoom({ user: req.user });
    res.json(out); // { roomId, isPro, model }
  } catch (err) {
    next(err);
  }
};

// 대화 (무료 15턴 제한 / 유료 무제한)
// POST /sim/chat
exports.chat = async (req, res, next) => {
  try {
    const { roomId, userMessage } = req.body || {};
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });
    if (!userMessage) return res.status(400).json({ error: 'userMessage is required' });

    const out = await svc.chat({ roomId, userMessage });
    res.json(out); // { aiText, finished, turns }
  } catch (err) {
    next(err);
  }
};

// 대화 종료 버튼 → 요약 생성 & DB 저장 → 방 삭제
// POST /sim/summary
exports.summarizeNow = async (req, res, next) => {
  try {
    const { roomId } = req.body || {};
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    const out = await svc.summarizeNow({ roomId });
    res.json(out); // { ok: true, id }
  } catch (err) {
    next(err);
  }
};

// (옵션) 방 강제 종료
// POST /sim/close
exports.close = async (req, res, next) => {
  try {
    const { roomId } = req.body || {};
    if (!roomId) return res.status(400).json({ error: 'roomId is required' });

    const out = await svc.closeRoom({ roomId });
    res.json(out); // { closed: true|false }
  } catch (err) {
    next(err);
  }
};
