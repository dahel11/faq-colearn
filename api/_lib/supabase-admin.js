const { createClient } = require('@supabase/supabase-js');

let client;

function getSupabaseAdmin() {
  if (!client) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }
    client = createClient(process.env.SUPABASE_BASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}

module.exports = { getSupabaseAdmin };
