import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { requireApiKey } from './auth.js';
import { health, listarOrdens, obterOrdem, upsertCliente, registrarSyncEvento } from './integration.js';
import { validarLicenca, statusLicenca } from './license.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', health);

// Licenciamento usado pelo PWA e pelo ERP Delphi.
app.post('/api/v1/licenciamento/validar', validarLicenca);
app.get('/api/v1/licenciamento/status', requireApiKey, statusLicenca);

// Endpoints de integração usados pelo ERP Delphi/serviços de sincronização.
app.get('/api/v1/ordens-servico', requireApiKey, listarOrdens);
app.get('/api/v1/ordens-servico/:id', requireApiKey, obterOrdem);
app.post('/api/v1/clientes/upsert', requireApiKey, upsertCliente);
app.post('/api/v1/sync/eventos', requireApiKey, registrarSyncEvento);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: 'ERRO_INTERNO',
    message: err.message
  });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`GestãoOficinas Integration API ouvindo na porta ${port}`));
