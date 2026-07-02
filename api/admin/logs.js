const { getSupabaseAdmin } = require('../_lib/supabase-admin');
const { isAuthenticated } = require('../_lib/auth');

const OUTCOMES = ['viewed', 'viewed_category', 'solved', 'not_solved', 'no_response', 'wa_click'];

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const { outcome, from, to } = req.query;

  let query = supabase
    .from('faq_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (outcome && OUTCOMES.includes(outcome)) query = query.eq('outcome', outcome);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error, count } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const summaryResults = await Promise.all(
    OUTCOMES.map(o => supabase.from('faq_logs').select('*', { count: 'exact', head: true }).eq('outcome', o))
  );
  const summary = {};
  OUTCOMES.forEach((o, i) => {
    summary[o] = summaryResults[i].count || 0;
  });

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ rows: data, total: count || 0, summary });
};
