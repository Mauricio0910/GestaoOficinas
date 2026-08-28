require('dotenv').config();
const path = require('path');

function bool(v, def=false){ if(v===undefined || v==='') return def; return String(v).toLowerCase()==='true'; }
function int(v, def){ const n=parseInt(v,10); return Number.isFinite(n)?n:def; }

const config = {
  port: int(process.env.API_PORT, 3031),
  apiKey: process.env.API_KEY || 'troque-esta-chave-local',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  productCode: process.env.PRODUCT_CODE || 'GESTAO_OFICINAS_PRO',
  sql: {
    server: process.env.SQL_SERVER || 'localhost',
    port: int(process.env.SQL_PORT, 1433),
    database: process.env.SQL_DATABASE || 'GestaoOficinas',
    user: process.env.SQL_USER || '',
    password: process.env.SQL_PASSWORD || '',
    encrypt: bool(process.env.SQL_ENCRYPT, false),
    trustServerCertificate: bool(process.env.SQL_TRUST_SERVER_CERTIFICATE, true)
  },
  firebase: {
    serviceAccountPath: path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.local.json'),
    tenantId: process.env.FIREBASE_TENANT_ID || 'oficina_demo'
  },
  sync: {
    enabled: bool(process.env.SYNC_ENABLED, false),
    intervalSeconds: int(process.env.SYNC_INTERVAL_SECONDS, 60),
    collections: (process.env.SYNC_COLLECTIONS || 'clientes,veiculos,ordens,servicos,pecas,usuarios,logs,catalogoVeiculos,catalogoPartes,catalogoPecas,servicosCatalogo')
      .split(',').map(x=>x.trim()).filter(Boolean)
  }
};
module.exports = { config };
