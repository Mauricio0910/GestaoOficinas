export function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return next();

  const provided = req.header('x-api-key') || req.query.api_key;
  if (provided !== expected) {
    return res.status(401).json({
      ok: false,
      error: 'API_KEY_INVALIDA',
      message: 'Chave de API inválida ou ausente.'
    });
  }

  next();
}

export function requestMeta(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || ''
  };
}
