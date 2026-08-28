
# Correção SQL Server - Patch 06

Este patch corrige os erros encontrados ao executar o script `05_sync_local_firebase_sql2019.sql`:

- `ISJSON is not a recognized built-in function name`
- `JSON_VALUE is not a recognized built-in function name`
- `Invalid column name tenant_id/produto_codigo/chave_licenca`
- `Cannot find the object goerp.SyncDocumentos`

## Causa

O ambiente SQL Server conectado não reconheceu funções JSON (`ISJSON`, `JSON_VALUE`, `OPENJSON`) ou o banco está com `compatibility_level` abaixo de 130.

Além disso, a tabela `goerp.LicencasProduto` já existia com o schema dos scripts anteriores, usando nomes como `TenantId`, `ProdutoCodigo`, `ChaveLicencaHash`, `Status`, `ValidaAteUtc`, e não os nomes novos em snake_case.

## Como usar

Execute no SSMS o conteúdo do arquivo:

```text
sqlserver/06_patch_compatibilidade_json_licenca.sql
```

Após executar, teste:

```sql
SELECT TOP (10) * FROM goerp.vwGO_LicencaStatus;
EXEC goerp.uspGO_ValidarLicencaLocal
    @TenantId = N'oficina_demo',
    @ProdutoCodigo = N'GESTAO_OFICINAS_PRO',
    @ChaveLicenca = N'GO-PRO-DEMO-2026';
SELECT TOP (10) * FROM goerp.SyncDocumentos;
```

## Se quiser habilitar views JSON completas no SQL Server 2019

Verifique:

```sql
SELECT @@VERSION;
SELECT DB_NAME() AS banco, compatibility_level
FROM sys.databases
WHERE name = DB_NAME();
```

Se o SQL Server for 2019, rode:

```sql
ALTER DATABASE [NOME_DO_SEU_BANCO] SET COMPATIBILITY_LEVEL = 150;
```

Depois execute novamente o patch 06.

Quando JSON estiver disponível, as views `vwGO_FirebaseClientes`, `vwGO_FirebaseVeiculos`,
`vwGO_FirebaseOrdensServico` e `vwGO_FirebaseInspecaoTecnica` passam a devolver campos parseados.

Quando JSON não estiver disponível, as views continuam funcionando, mas devolvem os dados em `payload_json`
para tratamento pela API ou Delphi.
