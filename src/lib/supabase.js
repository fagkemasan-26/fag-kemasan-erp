import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Client dengan hak akses penuh (Service Role) untuk operasi data master tanpa hambatan RLS
export const getAdminSupabase = () => {
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, secretKey);
};
