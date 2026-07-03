const { getSupabaseAdmin } = require('../_lib/supabase-admin');
const { isAuthenticated } = require('../_lib/auth');

const OUTCOMES = ['viewed', 'viewed_category', 'solved', 'not_solved', 'no_response', 'wa_click'];

const COLUMNS = [
  'id',
  'created_at',
  'session_id',
  'outcome',
  'category',
  'question',
  'breadcrumb',
  'processing_time_seconds',
  'page_url',
  'ip_address',
  'country',
  'region',
  'city',
  'timezone',
  'browser',
  'browser_version',
  'os',
  'os_version',
  'device_type',
  'accept_language',
  'user_agent',
];

const BATCH_SIZE = 1000;

function csvValue(value) {
  if (value === null || value === undefined) return '';
  let s;
  if (Array.isArray(value)) {
    s = value.map(step => step && step.label ? step.label : JSON.stringify(step)).join(' -> ');
  } else {
    s = String(value);
  }
  if (/[",\n\r]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

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

  const { outcome, from, to } = req.query;

  const rows = [];
  let offset = 0;
  while (true) {
    let query = supabase
      .from('faq_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (outcome && OUTCOMES.includes(outcome)) query = query.eq('outcome', outcome);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    rows.push(...data);
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(COLUMNS.map(col => csvValue(row[col])).join(','));
  }
  const csv = '﻿' + lines.join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="faq_logs_${stamp}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(csv);
};
