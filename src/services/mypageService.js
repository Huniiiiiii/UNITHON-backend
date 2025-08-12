const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.getMyPage = async (user) => {
  if (!user?.id) throw new AppError(401, 'Unauthorized');

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('name, type, sex, version')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr) throw new AppError(500, profileErr.message);

  return {
    id: user.id,
    name: profile?.name ?? null,
    type: profile?.type ?? null,
    sex: profile?.sex ?? null,
    version: profile?.version ?? null
  };
};
