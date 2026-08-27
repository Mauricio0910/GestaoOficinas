# Processo de licenciamento do GestãoOficinas Pro

## Objetivo comercial

O módulo GestãoOficinas Pro pode ser vendido como produto adicional da empresa. O licenciamento controla:

- qual cliente/tenant pode usar;
- validade da licença;
- quantidade máxima de dispositivos;
- plano comercial;
- bloqueio por inadimplência ou cancelamento;
- auditoria de ativações.

## Fluxo de licenciamento

### 1. Venda do adicional

No ERP/comercial da empresa:

1. Cliente contrata o adicional `GESTAO_OFICINAS_PRO`.
2. É criado um `TenantId`, por exemplo `oficina_matriz_123`.
3. É gerada uma chave comercial, por exemplo `GO-PRO-XXXX-XXXX-XXXX`.
4. A chave é gravada no SQL Server somente como hash SHA2-256.

### 2. Cadastro no SQL Server

Use a tabela:

```text
goerp.LicencasProduto
```

Ou adapte o script:

```text
sqlserver/04_seed_licenca_demo.sql
```

### 3. Ativação no app

No PWA:

```text
Configurações > Licenciamento do produto
```

Preencher:

- chave da licença;
- URL da API;
- tenant;
- deviceId.

O app chama:

```text
POST /api/v1/licenciamento/validar
```

### 4. Validação

A API executa:

```text
goerp.spGO_ValidarLicenca
```

Ela verifica:

- produto;
- tenant;
- hash da chave;
- status;
- validade;
- limite de dispositivos.

### 5. Heartbeat / renovação

A validação pode ser chamada periodicamente pelo app, por exemplo:

- ao login;
- a cada abertura;
- uma vez por dia;
- antes de operações críticas.

## Estados recomendados da licença

```text
DEMO
ATIVA
EXPIRADA
BLOQUEADA
CANCELADA
LIMITE_EXCEDIDO
INVALIDA
```

## Regras comerciais sugeridas

### Licença DEMO
- validade de 7 a 30 dias;
- limite de 1 a 5 dispositivos;
- aviso visual no dashboard.

### Licença ATIVA
- uso normal;
- validação silenciosa periódica.

### Licença EXPIRADA
- bloquear criação de novas OS;
- permitir consulta/exportação dos dados;
- exibir alerta para renovação.

### Licença BLOQUEADA
- bloquear uso operacional;
- manter acesso administrativo para backup.

## Segurança

- Nunca salve chave privada ou service account no GitHub.
- A chave da licença deve trafegar via HTTPS.
- No SQL Server, armazene hash da licença, não o texto puro.
- A API deve usar `x-api-key` para endpoints internos.
- Para ambientes de produção, adicione rate limit e logs por IP.

## Onde está implementado nesta atualização

### App PWA
Tela nova:

```text
Configurações > Licenciamento do produto
```

Arquivos alterados:

```text
index.html
app.js
styles.css
```

### SQL Server 2019

```text
sqlserver/00_schema_integracao_licenciamento.sql
sqlserver/01_views_integracao_delphi.sql
sqlserver/02_procedures_integracao_licenciamento.sql
sqlserver/03_indices_recomendados.sql
sqlserver/04_seed_licenca_demo.sql
```

### API

```text
api/gestao-oficinas-integration-api/
```

### Delphi

```text
delphi/GestaoOficinasIntegrationClient.pas
delphi/ExemploGestaoOficinasIntegration.dpr
```
