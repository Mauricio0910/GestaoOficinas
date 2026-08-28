const { sql, execProc } = require('./db');
const { config } = require('./config');

async function validarLicenca(body){
  const result = await execProc('goerp.uspGO_ValidarLicencaLocal', [
    { name:'TenantId', type:sql.NVarChar(80), value: body.tenantId || config.firebase.tenantId },
    { name:'ProdutoCodigo', type:sql.NVarChar(60), value: config.productCode },
    { name:'ChaveLicenca', type:sql.NVarChar(120), value: body.chaveLicenca || body.licenseKey || '' },
    { name:'Cnpj', type:sql.NVarChar(20), value: body.cnpj || null },
    { name:'DispositivoId', type:sql.NVarChar(120), value: body.deviceId || null },
    { name:'VersaoApp', type:sql.NVarChar(40), value: body.versaoApp || null }
  ]);
  const row = result.recordset?.[0] || {};
  return {
    ok: !!row.licenca_valida,
    status: row.status_licenca || 'SEM_RETORNO',
    message: row.mensagem || '',
    tenantId: row.tenant_id,
    produto: row.produto_codigo,
    validade: row.validade_fim,
    plano: row.plano
  };
}
module.exports = { validarLicenca };
