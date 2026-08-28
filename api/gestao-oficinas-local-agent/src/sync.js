const crypto = require('crypto');
const { sql, execProc, query } = require('./db');
const { getFirestore } = require('./firebase');
const { config } = require('./config');

let lastSync = { running:false, ok:null, startedAt:null, finishedAt:null, totalDocs:0, collections:{} };

function hash(s){ return crypto.createHash('sha256').update(s,'utf8').digest('hex'); }

async function upsert(tenantId, colecao, docId, payload){
  const payloadJson = JSON.stringify({ id:docId, ...payload });
  await execProc('goerp.uspGO_UpsertSyncDocumento', [
    { name:'TenantId', type:sql.NVarChar(80), value:tenantId },
    { name:'Colecao', type:sql.NVarChar(80), value:colecao },
    { name:'DocId', type:sql.NVarChar(160), value:docId },
    { name:'PayloadJson', type:sql.NVarChar(sql.MAX), value:payloadJson },
    { name:'HashPayload', type:sql.NVarChar(64), value:hash(payloadJson) }
  ]);
}

async function syncFirestoreToSqlOnce(options={}){
  if(lastSync.running) return { ...lastSync, ok:false, message:'Sincronização já em execução.' };
  const tenantId = options.tenantId || config.firebase.tenantId;
  const collections = options.collections || config.sync.collections;
  lastSync = { running:true, ok:null, startedAt:new Date().toISOString(), finishedAt:null, totalDocs:0, collections:{} };

  try {
    const db = getFirestore();
    let total=0, byCol={};
    for(const col of collections){
      const snap = await db.collection('oficinas').doc(tenantId).collection(col).get();
      let count=0;
      for(const doc of snap.docs){ await upsert(tenantId, col, doc.id, doc.data()); count++; }
      byCol[col]=count; total += count;
    }
    await query(`
      IF EXISTS (SELECT 1 FROM goerp.SyncControle WHERE chave='ULTIMA_SINCRONIZACAO_FIREBASE_SQL')
        UPDATE goerp.SyncControle SET valor=@Valor, atualizado_em_utc=SYSUTCDATETIME() WHERE chave='ULTIMA_SINCRONIZACAO_FIREBASE_SQL'
      ELSE
        INSERT INTO goerp.SyncControle(chave, valor) VALUES('ULTIMA_SINCRONIZACAO_FIREBASE_SQL', @Valor);
    `, { Valor:new Date().toISOString() });
    lastSync = { running:false, ok:true, startedAt:lastSync.startedAt, finishedAt:new Date().toISOString(), totalDocs:total, collections:byCol };
    return lastSync;
  } catch(e){
    lastSync = { ...lastSync, running:false, ok:false, finishedAt:new Date().toISOString(), message:e.message };
    throw e;
  }
}

function getSyncStatus(){ return lastSync; }

function startScheduler(){
  if(!config.sync.enabled) return console.log('[sync] desativado.');
  const ms = Math.max(15, config.sync.intervalSeconds) * 1000;
  console.log('[sync] ativo a cada ' + config.sync.intervalSeconds + 's.');
  setInterval(() => syncFirestoreToSqlOnce().catch(e => console.error('[sync]', e.message)), ms);
}

module.exports = { syncFirestoreToSqlOnce, getSyncStatus, startScheduler };
