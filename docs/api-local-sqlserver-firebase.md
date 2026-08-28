# GestãoOficinas Pro - API Local e Sincronização com SQL Server 2019

## Objetivo

Esta etapa cria a ponte:

```text
App Web / Firebase
        ↓
API Local / Agente
        ↓
SQL Server 2019 local
        ↓
ERP Delphi
```

Como o SQL Server é local, o GitHub Pages/Firebase Hosting não acessa o banco diretamente. O agente local lê o Firestore e grava uma cópia em `goerp.SyncDocumentos`.

## 1. Executar script SQL no SSMS

Execute no banco local:

```text
sqlserver/05_sync_local_firebase_sql2019.sql
```

Depois teste:

```sql
SELECT TOP (10) * FROM goerp.LicencasProduto;
SELECT TOP (10) * FROM goerp.vwGO_LicencaStatus;
```

## 2. Instalar API local

Na máquina/servidor que enxerga o SQL Server:

```bash
cd api/gestao-oficinas-local-agent
npm install
copy .env.example .env
```

Edite `.env` com os dados do seu SQL Server.

## 3. Service account Firebase

No Firebase Console:

```text
Project Settings > Service accounts > Generate new private key
```

Salve o arquivo como:

```text
api/gestao-oficinas-local-agent/serviceAccount.local.json
```

Não suba esse arquivo no GitHub.

## 4. Testes

```bash
npm run test:db
npm run sync:once
npm start
```

Teste no navegador/Postman:

```text
GET http://localhost:3031/health
Header: x-api-key = sua chave do .env
```

## 5. Sincronizar manualmente

```http
POST http://localhost:3031/api/v1/sync/firestore/importar
x-api-key: sua-chave

{
  "tenantId": "oficina_demo"
}
```

## 6. Views Delphi

```sql
SELECT * FROM goerp.vwGO_FirebaseClientes;
SELECT * FROM goerp.vwGO_FirebaseVeiculos;
SELECT * FROM goerp.vwGO_FirebaseOrdensServico;
SELECT * FROM goerp.vwGO_FirebaseInspecaoTecnica;
SELECT * FROM goerp.vwGO_FirebaseServicosAExecutar;
SELECT * FROM goerp.vwGO_FirebaseDashboardOficina;
SELECT * FROM goerp.vwGO_LicencaStatus;
```
