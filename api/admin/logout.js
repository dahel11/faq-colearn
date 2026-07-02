const { clearCookieHeader } = require('../_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', clearCookieHeader());
  res.status(200).json({ ok: true });
};
