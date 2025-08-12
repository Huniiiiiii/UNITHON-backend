const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/appError');

const isValidType = (s) =>
  typeof s === 'string' && /^[A-Z](\+[A-Z])*$/.test(s.trim());

exports.setType = async ({ userId, type }) => {
  const normalized = String(type ?? '').trim().toUpperCase();
  if (!isValidType(normalized)) {
    throw new AppError(400, 'type must look like "A+C" (letters joined by +)');
  }

  // UPDATE only: 프로필이 없으면 404 (insert 안 함)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ type: normalized })
    .eq('user_id', userId)
    .select('type')
    .single();

  if (error) {
    // no rows (PostgREST)
    if (error.code === 'PGRST116') {
      throw new AppError(404, 'Profile not found');
    }
    throw new AppError(500, error.message);
  }

  return data.type; // type만 반환
};
