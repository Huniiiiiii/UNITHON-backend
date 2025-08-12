const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorMiddleware = require('./src/middlewares/errorMiddleware');

// 라우트 개별 불러오기
const authRoute = require('./src/routes/authRoute');
const meRoute = require('./src/routes/mypageRoute');
const votesRoute = require('./src/routes/voteRoute');
const profileRoute = require('./src/routes/profileRoute');

const app = express();
app.use(cors());
app.use(express.json());

// 개별 라우트 등록
app.use('/onboard', authRoute);     // /onboard/login
app.use('/mypage', meRoute);             // /me
app.use('/votes', votesRoute);
app.use('/profile', profileRoute); // → POST /profile/type


// 전역 에러 핸들러는 마지막
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
