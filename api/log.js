const { createClient } = require('@supabase/supabase-js');
const { UAParser } = require('ua-parser-js');

const supabase = createClient(process.env.SUPABASE_BASE_URL, process.env.SUPABASE_ANON_KEY);

const VALID_OUTCOMES = ['viewed', 'viewed_category', 'solved', 'not_solved', 'no_response', 'wa_click'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  if (!body.session_id || !VALID_OUTCOMES.includes(body.outcome)) {
    res.status(400).json({ error: 'session_id and a valid outcome are required' });
    return;
  }

  const ua = new UAParser(req.headers['user-agent'] || '').getResult();
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.socket?.remoteAddress || null;

  const row = {
    session_id: body.session_id,
    category: body.category || null,
    question: body.question || null,
    outcome: body.outcome,
    processing_time_seconds: Number.isFinite(body.processing_time) ? body.processing_time : null,
    page_url: body.page_url || null,
    breadcrumb: Array.isArray(body.breadcrumb) ? body.breadcrumb : null,

    ip_address: ip,
    country: req.headers['x-vercel-ip-country'] || null,
    region: req.headers['x-vercel-ip-country-region'] || null,
    city: req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : null,
    timezone: req.headers['x-vercel-ip-timezone'] || null,
    user_agent: req.headers['user-agent'] || null,
    browser: ua.browser.name || null,
    browser_version: ua.browser.version || null,
    os: ua.os.name || null,
    os_version: ua.os.version || null,
    device_type: ua.device.type || 'desktop',
    accept_language: req.headers['accept-language'] || null,
  };

  const { error } = await supabase.from('faq_logs').insert(row);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(204).end();
};
