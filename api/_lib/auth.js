// Shared by api/admin/*. Files/folders under api/ prefixed with "_" are
// not deployed as routes by Vercel — this is plain shared code.
const crypto = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const COOKIE_NAME = 'admin_session';

function sessionSecret() {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }
  return crypto.createHash('sha256').update(`${process.env.ADMIN_PASSWORD}:session-secret`).digest('hex');
}

function signToken() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const sig = crypto.createHmac('sha256', sessionSecret()).update(String(expiresAt)).digest('hex');
  return `${expiresAt}.${sig}`;
}

function getCookie(req, name) {
  if (req.cookies && req.cookies[name] !== undefined) return req.cookies[name];
  const header = req.headers.cookie;
  if (!header) return undefined;
  const found = header
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : undefined;
}

function isAuthenticated(req) {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return false;
  const [expiresAtStr, sig] = token.split('.');
  if (!expiresAtStr || !sig) return false;

  let expected;
  try {
    expected = crypto.createHmac('sha256', sessionSecret()).update(expiresAtStr).digest('hex');
  } catch {
    return false;
  }

  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  return Date.now() < Number(expiresAtStr);
}

function sessionCookieHeader(token) {
  const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearCookieHeader() {
  const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`;
}

module.exports = { signToken, isAuthenticated, sessionCookieHeader, clearCookieHeader };
