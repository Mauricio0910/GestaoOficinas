import { getPool, sql } from './db.js';
import { requestMeta } from './auth.js';

export async function validarLicenca(req, res) {
  const {
    produto = process.env.PRODUCT_CODE || 'GESTAO_OFICINAS_PRO',
    chave,
    tenant,
    deviceId,
    plataforma = 'PWA',
    appVersion = ''
  } = req.body || {};

  if (!chave || !tenant || !deviceId) {
    return res.status(400).json({
      valida: false,
      status: 'REQUISICAO_INVALIDA',
      mensagem: 'Informe chave, tenant e deviceId.'
    });
  }

  const meta = requestMeta(req);
  const pool = await getPool();

  const result = await pool.request()
    .input('ProdutoCodigo', sql.NVarChar(80), produto)
    .input('TenantId', sql.NVarChar(80), tenant)
    .input('ChaveLicenca', sql.NVarChar(120), chave)
    .input('DeviceId', sql.NVarChar(120), deviceId)
    .input('Plataforma', sql.NVarChar(40), plataforma)
    .input('AppVersion', sql.NVarChar(40), appVersion)
    .input('IpOrigem', sql.NVarChar(60), meta.ip)
    .input('UserAgent', sql.NVarChar(600), meta.userAgent)
    .execute('goerp.spGO_ValidarLicenca');

  const row = result.recordset?.[0] || {};
  return res.status(row.Valida ? 200 : 403).json({
    valida: Boolean(row.Valida),
    status: row.Status,
    mensagem: row.Mensagem,
    validaAte: row.ValidaAteUtc
  });
}

export async function statusLicenca(req, res) {
  const { tenant } = req.query;
  const produto = req.query.produto || process.env.PRODUCT_CODE || 'GESTAO_OFICINAS_PRO';
  const pool = await getPool();

  const result = await pool.request()
    .input('ProdutoCodigo', sql.NVarChar(80), produto)
    .input('TenantId', sql.NVarChar(80), tenant || '')
    .query(`
      SELECT *
      FROM goerp.vwGO_LicencaStatus
      WHERE ProdutoCodigo = @ProdutoCodigo
        AND (@TenantId = '' OR TenantId = @TenantId)
      ORDER BY TenantId
    `);

  res.json({ ok: true, items: result.recordset || [] });
}
