# Integração Delphi + SQL Server 2019

## Objetivo

Esta atualização adiciona uma camada de integração para permitir que um ERP Delphi, usando SQL Server 2019, consuma dados do GestãoOficinas Pro como produto adicional.

## Estratégia recomendada

A arquitetura sugerida é:

```text
PWA GestãoOficinas Pro
        ↓
Firebase Cloud Firestore
        ↓
API de Integração / Licenciamento
        ↓
SQL Server 2019 - schema goerp
        ↓
ERP Delphi
```

O ERP Delphi deve consumir preferencialmente as views `goerp.vwGO_*`, mantendo isolamento entre o modelo interno do app e o modelo usado pelo ERP.

## Scripts SQL Server 2019

Execute nesta ordem:

```text
sqlserver/00_schema_integracao_licenciamento.sql
sqlserver/01_views_integracao_delphi.sql
sqlserver/02_procedures_integracao_licenciamento.sql
sqlserver/03_indices_recomendados.sql
sqlserver/04_seed_licenca_demo.sql
```

## Views principais

### `goerp.vwGO_Clientes`
Lista clientes com dados básicos e consentimento LGPD.

### `goerp.vwGO_Veiculos`
Lista veículos com cliente, tipo do veículo, placa, marca, modelo e ano.

### `goerp.vwGO_OrdensServico`
Lista OS com cliente, veículo, status, valores e datas.

### `goerp.vwGO_OrdensServicoServicos`
Lista serviços lançados em cada OS, incluindo comissão calculada.

### `goerp.vwGO_OrdensServicoPecas`
Lista peças usadas em cada OS.

### `goerp.vwGO_InspecaoTecnica`
Lista cada parte analisada no checklist técnico, com defeito, gravidade, status e serviço a executar.

### `goerp.vwGO_ServicosAExecutar`
Lista apenas serviços gerados/indicados pela inspeção técnica e ainda não concluídos.

### `goerp.vwGO_ComissoesMecanicos`
Apuração mensal de comissões por mecânico.

### `goerp.vwGO_DashboardOficina`
Resumo consolidado para dashboard Delphi.

### `goerp.vwGO_LicencaStatus`
Status comercial da licença do produto adicional.

## Exemplo de consulta Delphi/SQL

```sql
SELECT *
FROM goerp.vwGO_OrdensServico
WHERE TenantId = 'oficina_demo'
  AND EmAberto = 1
ORDER BY DataAberturaUtc DESC;
```

```sql
SELECT *
FROM goerp.vwGO_InspecaoTecnica
WHERE OrdemServicoId = @OrdemServicoId
ORDER BY ParteDescricao;
```

## Observações de implantação

- Não altere as views diretamente no ERP.
- Customizações específicas do cliente devem ser feitas em views novas, por exemplo `dbo.vwCliente_OS_Oficina`.
- Para grandes volumes, manter filtros por `TenantId` e datas.
- Dados sensíveis como CPF/CNPJ, chassi e Renavam devem ter controle de acesso no ERP.
- Use conta SQL específica para o ERP, com permissão `SELECT` nas views e sem permissão direta de escrita nas tabelas de integração.
