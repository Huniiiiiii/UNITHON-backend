const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorMiddleware = require('./src/middlewares/errorMiddleware');

// 라우트 개별 불러오기
const authRoute = require('./src/routes/authRoute');
const meRoute = require('./src/routes/mypageRoute');
const votesRoute = require('./src/routes/voteRoute');
const profileRoute = require('./src/routes/profileRoute');
const simRoute = require('./src/routes/simThreadRoute');
const reportRoute = require('./src/routes/simReportRoute');
const qnaRoute = require('./src/routes/qnaRoute');
const qnaReportRoute = require('./src/routes/chatSummaryRoute');

const app = express();
app.use(cors({
  origin: '*', // 모든 도메인 허용 (개발용), 보안 필요하면 'http://localhost:3000'처럼 명시
  credentials: true
}));

app.use(express.json());

// 개별 라우트 등록
app.use('/onboard', authRoute);     // /onboard/login
app.use('/mypage', meRoute);             // /me
app.use('/votes', votesRoute);
app.use('/profile', profileRoute); // → POST /profile/type
app.use('/sim', simRoute);
app.use('/report', reportRoute);
app.use('/qna', qnaRoute);
app.use('/qnareport', qnaReportRoute); // → GET /summary?date=YYYY-MM-DD

// 전역 에러 핸들러는 마지막
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
app.head('/health', (req, res) => res.sendStatus(200));