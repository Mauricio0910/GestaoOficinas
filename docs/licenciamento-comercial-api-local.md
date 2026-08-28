# Licenciamento comercial do produto adicional

## Fluxo

```text
ERP Delphi/App
        ↓
API Local
        ↓
goerp.uspGO_ValidarLicencaLocal
        ↓
goerp.LicencasProduto
```

## Licença demo criada pelo script

```text
GO-PRO-DEMO-2026
```

## Teste no SQL Server

```sql
EXEC goerp.uspGO_ValidarLicencaLocal
    @TenantId = N'oficina_demo',
    @ProdutoCodigo = N'GESTAO_OFICINAS_PRO',
    @ChaveLicenca = N'GO-PRO-DEMO-2026',
    @Cnpj = NULL,
    @DispositivoId = N'SERVIDOR-001',
    @VersaoApp = N'1.0.0';
```

## Teste via API

```http
POST http://localhost:3031/api/v1/licenciamento/validar
x-api-key: sua-chave

{
  "tenantId": "oficina_demo",
  "chaveLicenca": "GO-PRO-DEMO-2026",
  "deviceId": "SERVIDOR-001",
  "versaoApp": "1.0.0"
}
```

## Produção

Para produção, recomenda-se:

- uma chave diferente por cliente/CNPJ;
- validade por contrato;
- bloqueio por status;
- auditoria em `goerp.LicencaValidacoes`;
- cache de licença no ERP Delphi para contingência offline;
- geração de licença assinada no servidor da empresa.
