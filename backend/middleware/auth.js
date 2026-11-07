const jwt = require('jsonwebtoken');

function readToken(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function verify(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: payload.sub };
  } catch {
    return null;
  }
}

// Rejects with 401 unless a valid Bearer token is present; sets req.user = { id }.
function requireAuth(req, res, next) {
  const token = readToken(req);
  const user = token && verify(token);
  if (!user) return res.status(401).json({ error: 'authentication required' });
  req.user = user;
  next();
}

// Sets req.user if a valid token is present, but never rejects.
function optionalAuth(req, res, next) {
  const token = readToken(req);
  req.user = (token && verify(token)) || null;
  next();
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, optionalAuth, signToken };
