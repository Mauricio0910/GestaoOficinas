/*
  GestãoOficinas Pro - SQL Server 2019
  Script 01 - Views para consumo pelo ERP Delphi
  Versão corrigida: compatível sem CREATE OR ALTER

  Convenção:
  - Views prefixadas com vwGO_.
  - Campos calculados e textos já amigáveis para telas/relatórios Delphi.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'goerp.vwGO_Clientes', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_Clientes;
GO
CREATE VIEW goerp.vwGO_Clientes
AS
SELECT
    c.TenantId,
    c.ClienteId,
    c.TipoPessoa,
    CASE c.TipoPessoa WHEN 'F' THEN 'Pessoa Física' WHEN 'J' THEN 'Pessoa Jurídica' ELSE 'Não informado' END AS TipoPessoaDescricao,
    c.NomeRazao,
    c.CpfCnpj,
    c.Telefone,
    c.Whatsapp,
    c.Email,
    c.Endereco,
    c.ConsentimentoLgpd,
    c.Ativo,
    c.Origem,
    c.CriadoEmUtc,
    c.AtualizadoEmUtc
FROM goerp.Clientes c;
GO

IF OBJECT_ID(N'goerp.vwGO_Veiculos', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_Veiculos;
GO
CREATE VIEW goerp.vwGO_Veiculos
AS
SELECT
    v.TenantId,
    v.VeiculoId,
    v.ClienteId,
    c.NomeRazao AS ClienteNome,
    v.TipoVeiculo,
    CASE v.TipoVeiculo
        WHEN 'MOTO' THEN 'Moto'
        WHEN 'AUTOMOVEL' THEN 'Automóvel'
        WHEN 'SUV' THEN 'SUV'
        WHEN 'CAMINHONETE' THEN 'Caminhonete'
        WHEN 'CAMINHAO_TOCO' THEN 'Caminhão toco'
        WHEN 'CAMINHAO_BAU' THEN 'Caminhão baú'
        WHEN 'ONIBUS' THEN 'Ônibus'
        ELSE v.TipoVeiculo
    END AS TipoVeiculoDescricao,
    v.Placa,
    v.Chassi,
    v.Renavam,
    v.Marca,
    v.Modelo,
    CONCAT(ISNULL(v.Marca,''), ' ', ISNULL(v.Modelo,''), CASE WHEN v.AnoModelo IS NULL THEN '' ELSE CONCAT(' ', v.AnoModelo) END) AS VeiculoDescricao,
    v.AnoFabricacao,
    v.AnoModelo,
    v.Cor,
    v.Combustivel,
    v.KmAtual,
    v.OrigemDados,
    v.CriadoEmUtc,
    v.AtualizadoEmUtc
FROM goerp.Veiculos v
INNER JOIN goerp.Clientes c ON c.ClienteId = v.ClienteId;
GO

IF OBJECT_ID(N'goerp.vwGO_OrdensServico', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_OrdensServico;
GO
CREATE VIEW goerp.vwGO_OrdensServico
AS
SELECT
    os.TenantId,
    os.OrdemServicoId,
    os.Numero,
    os.Status,
    CASE os.Status
        WHEN 'ABERTA' THEN 'Aberta'
        WHEN 'DIAGNOSTICO' THEN 'Em diagnóstico'
        WHEN 'AGUARDANDO_APROVACAO' THEN 'Aguardando aprovação'
        WHEN 'APROVADA' THEN 'Aprovada'
        WHEN 'EM_EXECUCAO' THEN 'Em execução'
        WHEN 'AGUARDANDO_PECAS' THEN 'Aguardando peças'
        WHEN 'FINALIZADA' THEN 'Finalizada'
        WHEN 'FATURADA' THEN 'Faturada'
        WHEN 'CANCELADA' THEN 'Cancelada'
        ELSE os.Status
    END AS StatusDescricao,
    os.ClienteId,
    c.NomeRazao AS ClienteNome,
    v.VeiculoId,
    v.Placa,
    v.Marca,
    v.Modelo,
    v.AnoModelo,
    v.TipoVeiculo,
    CONCAT(ISNULL(v.Marca,''), ' ', ISNULL(v.Modelo,''), CASE WHEN v.AnoModelo IS NULL THEN '' ELSE CONCAT(' ', v.AnoModelo) END) AS VeiculoDescricao,
    os.KmEntrada,
    os.ReclamacaoCliente,
    os.DiagnosticoTecnico,
    os.PrevisaoEntrega,
    os.DataAberturaUtc,
    os.DataFechamentoUtc,
    os.AprovadoEmUtc,
    os.FaturadoEmUtc,
    os.ValorServicos,
    os.ValorPecas,
    os.ValorTotal,
    os.CriadoPorNome,
    os.AtualizadoEmUtc,
    CASE WHEN os.Status IN ('FINALIZADA','FATURADA','CANCELADA') THEN 0 ELSE 1 END AS EmAberto
FROM goerp.OrdensServico os
INNER JOIN goerp.Clientes c ON c.ClienteId = os.ClienteId
INNER JOIN goerp.Veiculos v ON v.VeiculoId = os.VeiculoId;
GO

IF OBJECT_ID(N'goerp.vwGO_OrdensServicoServicos', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_OrdensServicoServicos;
GO
CREATE VIEW goerp.vwGO_OrdensServicoServicos
AS
SELECT
    s.OrdemServicoServicoId,
    os.TenantId,
    os.Numero,
    s.OrdemServicoId,
    s.ServicoIdOrigem,
    s.ParteVeiculo,
    s.Descricao,
    s.MecanicoNome,
    s.Quantidade,
    s.ValorUnitario,
    s.ValorTotal,
    s.PercentualComissao,
    CAST((s.ValorTotal * s.PercentualComissao) / 100.0 AS DECIMAL(18,2)) AS ValorComissao,
    s.StatusServico,
    s.CriadoEmUtc
FROM goerp.OrdemServicoServicos s
INNER JOIN goerp.OrdensServico os ON os.OrdemServicoId = s.OrdemServicoId;
GO

IF OBJECT_ID(N'goerp.vwGO_OrdensServicoPecas', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_OrdensServicoPecas;
GO
CREATE VIEW goerp.vwGO_OrdensServicoPecas
AS
SELECT
    p.OrdemServicoPecaId,
    os.TenantId,
    os.Numero,
    p.OrdemServicoId,
    p.PecaIdOrigem,
    p.ParteVeiculo,
    p.Sku,
    p.Descricao,
    p.Quantidade,
    p.ValorUnitario,
    p.ValorTotal,
    p.CriadoEmUtc
FROM goerp.OrdemServicoPecas p
INNER JOIN goerp.OrdensServico os ON os.OrdemServicoId = p.OrdemServicoId;
GO

IF OBJECT_ID(N'goerp.vwGO_InspecaoTecnica', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_InspecaoTecnica;
GO
CREATE VIEW goerp.vwGO_InspecaoTecnica
AS
SELECT
    i.TenantId,
    os.Numero,
    i.OrdemServicoId,
    i.InspecaoParteId,
    i.TipoVeiculo,
    i.ParteKey,
    i.ParteDescricao,
    i.Defeito,
    i.Gravidade,
    i.StatusAnalise,
    i.ObservacaoTecnica,
    i.FotoUrl,
    i.ServicoSugerido,
    i.ServicoCustomizado,
    COALESCE(NULLIF(i.ServicoCustomizado,''), NULLIF(i.ServicoSugerido,'')) AS ServicoAExecutar,
    i.StatusServico,
    i.PosX,
    i.PosY,
    i.AtualizadoEmUtc,
    CASE WHEN ISNULL(i.StatusAnalise,'') NOT IN ('Resolvido','Concluído','CONCLUIDO') THEN 1 ELSE 0 END AS Pendente
FROM goerp.InspecaoTecnicaPartes i
INNER JOIN goerp.OrdensServico os ON os.OrdemServicoId = i.OrdemServicoId;
GO

IF OBJECT_ID(N'goerp.vwGO_ServicosAExecutar', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_ServicosAExecutar;
GO
CREATE VIEW goerp.vwGO_ServicosAExecutar
AS
SELECT
    TenantId,
    OrdemServicoId,
    Numero,
    InspecaoParteId,
    TipoVeiculo,
    ParteDescricao,
    Defeito,
    Gravidade,
    ServicoAExecutar,
    StatusServico,
    AtualizadoEmUtc
FROM goerp.vwGO_InspecaoTecnica
WHERE NULLIF(ServicoAExecutar,'') IS NOT NULL
  AND ISNULL(StatusServico,'A executar') NOT IN ('Concluído','CONCLUIDO','Cancelado','CANCELADO');
GO

IF OBJECT_ID(N'goerp.vwGO_ComissoesMecanicos', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_ComissoesMecanicos;
GO
CREATE VIEW goerp.vwGO_ComissoesMecanicos
AS
SELECT
    os.TenantId,
    s.MecanicoNome,
    YEAR(os.DataAberturaUtc) AS Ano,
    MONTH(os.DataAberturaUtc) AS Mes,
    COUNT(DISTINCT os.OrdemServicoId) AS QtdeOS,
    SUM(s.ValorTotal) AS ValorServicos,
    SUM(CAST((s.ValorTotal * s.PercentualComissao) / 100.0 AS DECIMAL(18,2))) AS ValorComissao
FROM goerp.OrdemServicoServicos s
INNER JOIN goerp.OrdensServico os ON os.OrdemServicoId = s.OrdemServicoId
GROUP BY os.TenantId, s.MecanicoNome, YEAR(os.DataAberturaUtc), MONTH(os.DataAberturaUtc);
GO

IF OBJECT_ID(N'goerp.vwGO_DashboardOficina', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_DashboardOficina;
GO
CREATE VIEW goerp.vwGO_DashboardOficina
AS
SELECT
    os.TenantId,
    COUNT(*) AS TotalOS,
    SUM(CASE WHEN os.Status NOT IN ('FINALIZADA','FATURADA','CANCELADA') THEN 1 ELSE 0 END) AS OSAbertas,
    SUM(CASE WHEN os.Status = 'AGUARDANDO_APROVACAO' THEN 1 ELSE 0 END) AS AguardandoAprovacao,
    SUM(CASE WHEN os.Status = 'EM_EXECUCAO' THEN 1 ELSE 0 END) AS EmExecucao,
    SUM(CASE WHEN os.Status IN ('FINALIZADA','FATURADA') THEN 1 ELSE 0 END) AS FinalizadasFaturadas,
    SUM(os.ValorTotal) AS ValorTotalGeral,
    AVG(NULLIF(os.ValorTotal, 0)) AS TicketMedio,
    SUM(CASE WHEN i.Pendente = 1 THEN 1 ELSE 0 END) AS DefeitosPendentes
FROM goerp.OrdensServico os
LEFT JOIN goerp.vwGO_InspecaoTecnica i ON i.OrdemServicoId = os.OrdemServicoId
GROUP BY os.TenantId;
GO

IF OBJECT_ID(N'goerp.vwGO_LicencaStatus', N'V') IS NOT NULL
    DROP VIEW goerp.vwGO_LicencaStatus;
GO
CREATE VIEW goerp.vwGO_LicencaStatus
AS
SELECT
    l.LicencaId,
    l.ProdutoCodigo,
    l.TenantId,
    l.CnpjCliente,
    l.RazaoSocial,
    l.Plano,
    l.Status,
    l.MaxDispositivos,
    l.MaxFiliais,
    l.ValidaDeUtc,
    l.ValidaAteUtc,
    CASE
        WHEN l.Status <> 'ATIVA' THEN l.Status
        WHEN l.ValidaAteUtc IS NOT NULL AND l.ValidaAteUtc < SYSUTCDATETIME() THEN 'EXPIRADA'
        ELSE 'ATIVA'
    END AS StatusCalculado,
    COUNT(a.AtivacaoId) AS DispositivosAtivados,
    MAX(a.UltimoHeartbeatUtc) AS UltimoHeartbeatUtc,
    l.AtualizadoEmUtc
FROM goerp.LicencasProduto l
LEFT JOIN goerp.LicencaAtivacoes a ON a.LicencaId = l.LicencaId AND a.Status = 'ATIVA'
GROUP BY
    l.LicencaId, l.ProdutoCodigo, l.TenantId, l.CnpjCliente, l.RazaoSocial,
    l.Plano, l.Status, l.MaxDispositivos, l.MaxFiliais, l.ValidaDeUtc, l.ValidaAteUtc, l.AtualizadoEmUtc;
GO
