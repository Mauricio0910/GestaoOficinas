const express = require('express');
const { query } = require('./db');
const { validarLicenca } = require('./license');
const { syncFirestoreToSqlOnce, getSyncStatus } = require('./sync');
const { config } = require('./config');

const router = express.Router();

router.get('/health', async (req,res) => {
  await query('SELECT 1 AS ok');
  res.json({ ok:true, app:'gestao-oficinas-local-agent', tenantId:config.firebase.tenantId, sync:getSyncStatus() });
});

router.post('/api/v1/licenciamento/validar', async (req,res) => {
  try { const r = await validarLicenca(req.body || {}); res.status(r.ok ? 200 : 403).json(r); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/api/v1/licenciamento/status', async (req,res) => {
  const r = await query('SELECT TOP (20) * FROM goerp.vwGO_LicencaStatus ORDER BY validade_fim DESC');
  res.json({ ok:true, data:r.recordset });
});

router.post('/api/v1/sync/firestore/importar', async (req,res) => {
  try { res.json({ ok:true, data: await syncFirestoreToSqlOnce(req.body || {}) }); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

router.get('/api/v1/sync/status', (req,res) => res.json({ ok:true, data:getSyncStatus() }));

router.get('/api/v1/sql/clientes', async (req,res) => res.json({ ok:true, data:(await query('SELECT TOP (500) * FROM goerp.vwGO_FirebaseClientes ORDER BY atualizado_em_utc DESC')).recordset }));
router.get('/api/v1/sql/veiculos', async (req,res) => res.json({ ok:true, data:(await query('SELECT TOP (500) * FROM goerp.vwGO_FirebaseVeiculos ORDER BY atualizado_em_utc DESC')).recordset }));
router.get('/api/v1/sql/ordens-servico', async (req,res) => res.json({ ok:true, data:(await query('SELECT TOP (500) * FROM goerp.vwGO_FirebaseOrdensServico ORDER BY data_abertura DESC')).recordset }));
router.get('/api/v1/sql/inspecoes', async (req,res) => res.json({ ok:true, data:(await query('SELECT TOP (1000) * FROM goerp.vwGO_FirebaseInspecaoTecnica ORDER BY atualizado_em_utc DESC')).recordset }));
router.get('/api/v1/sql/servicos-a-executar', async (req,res) => res.json({ ok:true, data:(await query('SELECT TOP (1000) * FROM goerp.vwGO_FirebaseServicosAExecutar ORDER BY atualizado_em_utc DESC')).recordset }));

module.exports = { router };
