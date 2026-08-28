const { syncFirestoreToSqlOnce } = require('./sync');
const { closePool } = require('./db');
syncFirestoreToSqlOnce().then(r => {
  console.log(JSON.stringify(r, null, 2));
  return closePool();
}).then(()=>process.exit(0)).catch(async e => { console.error(e); await closePool(); process.exit(1); });
