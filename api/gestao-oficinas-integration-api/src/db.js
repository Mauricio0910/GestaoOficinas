import sql from 'mssql';

let pool;

export async function getPool() {
  if (pool?.connected) return pool;

  const config = {
    server: process.env.SQLSERVER_HOST,
    port: Number(process.env.SQLSERVER_PORT || 1433),
    database: process.env.SQLSERVER_DATABASE,
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    options: {
      encrypt: String(process.env.SQLSERVER_ENCRYPT || 'false') === 'true',
      trustServerCertificate: String(process.env.SQLSERVER_TRUST_CERT || 'true') === 'true'
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  pool = await sql.connect(config);
  return pool;
}

export { sql };
