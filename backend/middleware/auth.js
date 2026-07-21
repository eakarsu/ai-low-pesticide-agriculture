const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({ error: 'Authentication is not configured' });
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const user = jwt.verify(auth.slice(7), secret, { algorithms: ['HS256'] });
    if (!user.id || !user.role || !user.tenantId) throw new Error('missing required claims');
    req.user = user;
    next();
  }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};
