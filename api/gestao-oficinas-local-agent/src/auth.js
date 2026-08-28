const { config } = require('./config');

function apiKeyMiddleware(req,res,next){
  const header = req.header('x-api-key');
  const auth = req.header('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.substring(7) : null;
  if(header === config.apiKey || bearer === config.apiKey) return next();
  return res.status(401).json({ ok:false, error:'API_KEY_INVALIDA' });
}
module.exports = { apiKeyMiddleware };
