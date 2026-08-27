# Deploy da API de Integração

## Requisitos

- Node.js 20 ou superior.
- SQL Server 2019 acessível pela API.
- Scripts SQL da pasta `sqlserver` executados.
- HTTPS em produção.

## Configuração

Copie o arquivo:

```text
api/gestao-oficinas-integration-api/.env.example
```

para:

```text
.env
```

Preencha:

```env
API_KEY=sua-chave-interna
SQLSERVER_HOST=servidor-sql
SQLSERVER_DATABASE=GestaoOficinasIntegracao
SQLSERVER_USER=usuario_api
SQLSERVER_PASSWORD=senha_forte
PRODUCT_CODE=GESTAO_OFICINAS_PRO
```

## Rodar

```bash
cd api/gestao-oficinas-integration-api
npm install
npm start
```

## Teste

```bash
curl https://api.suaempresa.com.br/health
```

## Validar licença

```bash
curl -X POST https://api.suaempresa.com.br/api/v1/licenciamento/validar \
  -H "Content-Type: application/json" \
  -d '{
    "produto": "GESTAO_OFICINAS_PRO",
    "chave": "GO-PRO-DEMO-0001-0001",
    "tenant": "oficina_demo",
    "deviceId": "web-demo-001",
    "origem": "PWA"
  }'
```

## Próximas melhorias recomendadas

- Rate limit por IP.
- Logs estruturados.
- JWT interno para ERP.
- Cloud Run ou Windows Service.
- Serviço agendado para espelhar Firestore no SQL Server.
