const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('./config');
const { apiKeyMiddleware } = require('./auth');
const { router } = require('./routes');
const { startScheduler } = require('./sync');

const app = express();
app.use(helmet({ crossOriginResourcePolicy:false }));
app.use(cors({ origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(',').map(x=>x.trim()) }));
app.use(express.json({ limit:'10mb' }));
app.use(morgan('combined'));

app.get('/', (req,res) => res.json({ ok:true, name:'GestãoOficinas Pro API Local', version:'1.0.0' }));
app.use(apiKeyMiddleware);
app.use(router);
app.use((err,req,res,next) => res.status(500).json({ ok:false, error:err.message }));

app.listen(config.port, () => {
  console.log('API Local em http://localhost:' + config.port);
  console.log('Tenant: ' + config.firebase.tenantId);
  startScheduler();
});
