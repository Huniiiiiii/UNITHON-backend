// src/services/myPageService.js
const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const typeMypageSet = require('../data/typeMypageSet.json'); // JSON 파일 import

exports.getMyPage = async (user) => {
  if (!user?.id) throw new AppError(401, 'Unauthorized');

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('name, type, sex, version')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr) throw new AppError(500, profileErr.message);

  // type에 해당하는 story 찾기
  let story = null;
  if (profile?.type) {
    const match = typeMypageSet.find((item) => item.type === profile.type);
    story = match ? match.story : null;
  }

  return {
    id: user.id,
    name: profile?.name ?? null,
    type: profile?.type ?? null,
    story: story, // 추가된 부분
    sex: profile?.sex ?? null,
    version: profile?.version ?? null
  };
};
