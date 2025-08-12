const { supabaseAuth, supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.loginWithEmail = async ({ email, password }) => {
  if (!email || !password) throw new AppError(400, 'email and password are required');

  // 1) 로그인 (토큰 발급)
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('invalid')) throw new AppError(401, 'Invalid email or password');
    throw new AppError(500, 'Login failed');
  }

  const { user, session } = data || {};
  if (!session?.access_token || !user?.id) throw new AppError(500, 'No session returned');

  // 2) 프로필 name 조회 (service role 사용)
  let name = null;
  {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)         // ← FK 컬럼명이 다르면 여기만 바꾸세요 (예: .eq('id', user.id))
      .single();

    if (profileErr && profileErr.code !== 'PGRST116') { // no rows는 무시
      throw new AppError(500, profileErr.message || 'Failed to fetch profile');
    }
    name = profile?.name ?? null;
  }

  // 3) 필요한 값만 리턴 (user 전체 X)
  return {
    id: user.id,
    name, // 없으면 null
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in
  };
};
