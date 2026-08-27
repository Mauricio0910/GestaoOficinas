# Correção SQL Server - Views/Procedures

Esta atualização substitui `CREATE OR ALTER VIEW/PROCEDURE` por:

- `IF OBJECT_ID(...) IS NOT NULL DROP ...`
- `GO`
- `CREATE VIEW/PROCEDURE`

Use quando seu SQL Server/SSMS acusar:

- `Incorrect syntax near the keyword 'OR'`
- `'ALTER VIEW' must be the first statement in a query batch`

## Ordem de execução no SSMS

1. `sqlserver/00_schema_integracao_licenciamento.sql`
2. `sqlserver/01_views_integracao_delphi.sql`
3. `sqlserver/02_procedures_integracao_licenciamento.sql`
4. `sqlserver/03_indices_recomendados.sql`
5. `sqlserver/04_seed_licenca_demo.sql`

Execute cada arquivo em uma janela do SSMS, conectado no banco correto.
