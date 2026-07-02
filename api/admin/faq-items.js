const { getSupabaseAdmin } = require('../_lib/supabase-admin');
const { isAuthenticated } = require('../_lib/auth');

const WRITABLE_FIELDS = [
  'parent_id',
  'position',
  'type',
  'label',
  'answer',
  'wa_message',
  'branch_question',
  'image',
  'layout',
];

function pickWritable(source) {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (source[key] !== undefined) out[key] = source[key] === '' ? null : source[key];
  }
  return out;
}

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('faq_items').select('*').order('position');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!body.id || !body.type || !body.label) {
      return res.status(400).json({ error: 'id, type, dan label wajib diisi' });
    }
    const { error } = await supabase.from('faq_items').insert({ id: body.id, ...pickWritable(body) });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  if (req.method === 'PUT') {
    if (!body.id) return res.status(400).json({ error: 'id wajib diisi' });
    const fields = pickWritable(body);
    fields.updated_at = new Date().toISOString();
    const { error } = await supabase.from('faq_items').update(fields).eq('id', body.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id || body.id;
    if (!id) return res.status(400).json({ error: 'id wajib diisi' });
    const { error } = await supabase.from('faq_items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
