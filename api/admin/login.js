const { signToken, sessionCookieHeader } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  if (body.password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Password salah' });
    return;
  }

  res.setHeader('Set-Cookie', sessionCookieHeader(signToken()));
  res.status(200).json({ ok: true });
};
