import { getPool, sql } from './db.js';
import { v4 as uuidv4 } from 'uuid';

function asGuid(value) {
  return value || uuidv4();
}

export async function health(req, res) {
  const pool = await getPool();
  await pool.request().query('SELECT 1 AS ok');
  res.json({ ok: true, service: 'GestaoOficinas Integration API' });
}

export async function listarOrdens(req, res) {
  const { tenant, status, desde } = req.query;
  const pool = await getPool();

  const result = await pool.request()
    .input('TenantId', sql.NVarChar(80), tenant || '')
    .input('Status', sql.NVarChar(40), status || '')
    .input('Desde', sql.DateTime2, desde ? new Date(desde) : null)
    .query(`
      SELECT TOP 500 *
      FROM goerp.vwGO_OrdensServico
      WHERE (@TenantId = '' OR TenantId = @TenantId)
        AND (@Status = '' OR Status = @Status)
        AND (@Desde IS NULL OR AtualizadoEmUtc >= @Desde)
      ORDER BY DataAberturaUtc DESC
    `);

  res.json({ ok: true, items: result.recordset || [] });
}

export async function obterOrdem(req, res) {
  const { id } = req.params;
  const pool = await getPool();

  const request = pool.request().input('Id', sql.UniqueIdentifier, id);

  const os = await request.query('SELECT * FROM goerp.vwGO_OrdensServico WHERE OrdemServicoId = @Id');
  if (!os.recordset?.length) return res.status(404).json({ ok: false, error: 'OS_NAO_ENCONTRADA' });

  const [servicos, pecas, inspecao] = await Promise.all([
    pool.request().input('Id', sql.UniqueIdentifier, id).query('SELECT * FROM goerp.vwGO_OrdensServicoServicos WHERE OrdemServicoId = @Id'),
    pool.request().input('Id', sql.UniqueIdentifier, id).query('SELECT * FROM goerp.vwGO_OrdensServicoPecas WHERE OrdemServicoId = @Id'),
    pool.request().input('Id', sql.UniqueIdentifier, id).query('SELECT * FROM goerp.vwGO_InspecaoTecnica WHERE OrdemServicoId = @Id')
  ]);

  res.json({
    ok: true,
    item: {
      ...os.recordset[0],
      servicos: servicos.recordset || [],
      pecas: pecas.recordset || [],
      inspecaoTecnica: inspecao.recordset || []
    }
  });
}

export async function upsertCliente(req, res) {
  const item = req.body || {};
  const pool = await getPool();
  const id = asGuid(item.id || item.clienteId);

  await pool.request()
    .input('ClienteId', sql.UniqueIdentifier, id)
    .input('TenantId', sql.NVarChar(80), item.tenantId || item.tenant || 'oficina_demo')
    .input('TipoPessoa', sql.Char(1), item.tipoPessoa || 'F')
    .input('NomeRazao', sql.NVarChar(160), item.nomeRazao || item.nome || '')
    .input('CpfCnpj', sql.NVarChar(20), item.cpfCnpj || '')
    .input('Telefone', sql.NVarChar(30), item.telefone || '')
    .input('Whatsapp', sql.NVarChar(30), item.whatsapp || '')
    .input('Email', sql.NVarChar(160), item.email || '')
    .input('Endereco', sql.NVarChar(400), item.endereco || '')
    .input('ConsentimentoLgpd', sql.Bit, Boolean(item.consentimentoLgpd))
    .execute('goerp.spGO_UpsertCliente');

  res.json({ ok: true, clienteId: id });
}

export async function registrarSyncEvento(req, res) {
  const item = req.body || {};
  const pool = await getPool();

  await pool.request()
    .input('TenantId', sql.NVarChar(80), item.tenantId || item.tenant || 'oficina_demo')
    .input('Entidade', sql.NVarChar(80), item.entidade)
    .input('EntidadeId', sql.NVarChar(80), item.entidadeId)
    .input('Operacao', sql.NVarChar(20), item.operacao || 'UPSERT')
    .input('Origem', sql.NVarChar(30), item.origem || 'API')
    .input('PayloadJson', sql.NVarChar(sql.MAX), item.payload ? JSON.stringify(item.payload) : null)
    .execute('goerp.spGO_RegistrarSyncEvento');

  res.json({ ok: true });
}
