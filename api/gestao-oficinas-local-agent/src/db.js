const sql = require('mssql');
const { config } = require('./config');

let poolPromise = null;

function getPool(){
  if(!poolPromise){
    poolPromise = sql.connect({
      server: config.sql.server,
      port: config.sql.port,
      database: config.sql.database,
      user: config.sql.user,
      password: config.sql.password,
      options: {
        encrypt: config.sql.encrypt,
        trustServerCertificate: config.sql.trustServerCertificate,
        enableArithAbort: true
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      requestTimeout: 60000
    });
  }
  return poolPromise;
}

async function query(q, params={}){
  const pool = await getPool();
  const req = pool.request();
  for (const [k,v] of Object.entries(params)) req.input(k, v);
  return req.query(q);
}

async function execProc(name, inputs=[]){
  const pool = await getPool();
  const req = pool.request();
  for (const i of inputs) req.input(i.name, i.type, i.value);
  return req.execute(name);
}

async function closePool(){
  if(poolPromise){ const p = await poolPromise; await p.close(); poolPromise=null; }
}

module.exports = { sql, getPool, query, execProc, closePool };
