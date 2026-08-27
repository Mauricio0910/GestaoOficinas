# GestãoOficinas Pro - API de Integração e Licenciamento

API REST para integrar o app GestãoOficinas Pro com um ERP Delphi usando SQL Server 2019.

## Funções

- Validar licença do produto adicional.
- Consultar ordens de serviço completas.
- Disponibilizar dados em formato JSON para aplicações Delphi.
- Registrar eventos de sincronização.
- Usar as views SQL Server como camada estável para relatórios e telas Delphi.

## Instalação

```bash
npm install
cp .env.example .env
npm start
```

## Scripts SQL necessários

Execute no SQL Server 2019, nesta ordem:

```text
sqlserver/00_schema_integracao_licenciamento.sql
sqlserver/01_views_integracao_delphi.sql
sqlserver/02_procedures_integracao_licenciamento.sql
sqlserver/03_indices_recomendados.sql
sqlserver/04_seed_licenca_demo.sql
```

## Validação da licença no app

No app, vá em:

```text
Configurações > Licenciamento do produto
```

Preencha:

- chave da licença;
- URL da API;
- tenant;
- deviceId.

Endpoint usado pelo PWA:

```text
POST /api/v1/licenciamento/validar
```
