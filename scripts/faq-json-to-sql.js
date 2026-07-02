// Regenerates supabase/seed.sql from faq.json.
// Run with: node scripts/faq-json-to-sql.js
//
// Use this whenever faq.json is edited and you want to re-sync Supabase
// by re-running the generated seed.sql in the Supabase SQL editor.

const fs = require('fs');
const path = require('path');

const faqPath = path.join(__dirname, '..', 'faq.json');
const outPath = path.join(__dirname, '..', 'supabase', 'seed.sql');

const faqData = JSON.parse(fs.readFileSync(faqPath, 'utf8'));

function sqlString(value) {
  if (value === undefined || value === null) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

const rows = [];

function walk(node, parentId, position) {
  rows.push({
    id: node.id,
    parent_id: parentId,
    position,
    type: node.type,
    label: node.label,
    answer: node.answer,
    wa_message: node.waMessage,
    branch_question: node.branch_question,
    image: node.image,
    layout: node.layout,
  });
  (node.children || []).forEach((child, i) => walk(child, node.id, i));
}

faqData.forEach((node, i) => walk(node, null, i));

const values = rows
  .map(
    r =>
      `  (${sqlString(r.id)}, ${sqlString(r.parent_id)}, ${r.position}, ${sqlString(r.type)}, ${sqlString(
        r.label
      )}, ${sqlString(r.answer)}, ${sqlString(r.wa_message)}, ${sqlString(r.branch_question)}, ${sqlString(
        r.image
      )}, ${sqlString(r.layout)})`
  )
  .join(',\n');

const sql = `-- Generated from faq.json by scripts/faq-json-to-sql.js — do not edit by hand.
-- Run this in the Supabase SQL Editor AFTER schema.sql.

truncate table faq_items restart identity cascade;

insert into faq_items
  (id, parent_id, position, type, label, answer, wa_message, branch_question, image, layout)
values
${values};
`;

fs.writeFileSync(outPath, sql);
console.log(`Wrote ${rows.length} rows to ${outPath}`);
