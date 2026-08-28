const { query, closePool } = require('./db');
query('SELECT @@VERSION AS versao_sql_server').then(r => {
  console.log(r.recordset[0]);
  return closePool();
}).then(()=>process.exit(0)).catch(async e => { console.error(e); await closePool(); process.exit(1); });
