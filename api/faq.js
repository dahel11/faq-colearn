const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_BASE_URL, process.env.SUPABASE_ANON_KEY);

function toNode(row) {
  const node = { id: row.id, label: row.label, type: row.type };
  if (row.answer) node.answer = row.answer;
  if (row.wa_message) node.waMessage = row.wa_message;
  if (row.branch_question) node.branch_question = row.branch_question;
  if (row.image) node.image = row.image;
  if (row.layout) node.layout = row.layout;
  return node;
}

function buildTree(rows) {
  const byId = new Map(rows.map(row => [row.id, toNode(row)]));
  const roots = [];
  for (const row of rows) {
    const node = byId.get(row.id);
    if (row.parent_id) {
      const parent = byId.get(row.parent_id);
      if (!parent) continue;
      (parent.children = parent.children || []).push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Short cache: absorbs traffic bursts but keeps admin edits visible within seconds.
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
  res.status(200).json(buildTree(data));
};
