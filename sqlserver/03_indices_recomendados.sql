/*
  GestãoOficinas Pro - SQL Server 2019
  Script 03 - Índices recomendados
*/

CREATE INDEX IX_GOERP_Clientes_TenantNome ON goerp.Clientes (TenantId, NomeRazao);
CREATE INDEX IX_GOERP_Clientes_TenantCpfCnpj ON goerp.Clientes (TenantId, CpfCnpj) WHERE CpfCnpj IS NOT NULL;

CREATE INDEX IX_GOERP_Veiculos_TenantPlaca ON goerp.Veiculos (TenantId, Placa) WHERE Placa IS NOT NULL;
CREATE INDEX IX_GOERP_Veiculos_Cliente ON goerp.Veiculos (ClienteId);

CREATE INDEX IX_GOERP_OS_TenantStatusData ON goerp.OrdensServico (TenantId, Status, DataAberturaUtc DESC) INCLUDE (Numero, ClienteId, VeiculoId, ValorServicos, ValorPecas);
CREATE INDEX IX_GOERP_OS_Cliente ON goerp.OrdensServico (ClienteId, DataAberturaUtc DESC);
CREATE INDEX IX_GOERP_OS_Veiculo ON goerp.OrdensServico (VeiculoId, DataAberturaUtc DESC);

CREATE INDEX IX_GOERP_OSServicos_OS ON goerp.OrdemServicoServicos (OrdemServicoId);
CREATE INDEX IX_GOERP_OSPecas_OS ON goerp.OrdemServicoPecas (OrdemServicoId);
CREATE INDEX IX_GOERP_Inspecao_OS ON goerp.InspecaoTecnicaPartes (OrdemServicoId, StatusAnalise);
CREATE INDEX IX_GOERP_Inspecao_TenantParte ON goerp.InspecaoTecnicaPartes (TenantId, TipoVeiculo, ParteKey);

CREATE INDEX IX_GOERP_Sync_Pendentes ON goerp.SyncEventos (Processado, CriadoEmUtc) INCLUDE (TenantId, Entidade, EntidadeId, Operacao, Tentativas);
CREATE INDEX IX_GOERP_Licencas_TenantProduto ON goerp.LicencasProduto (TenantId, ProdutoCodigo, Status);
CREATE INDEX IX_GOERP_LicAtivacoes_LicencaStatus ON goerp.LicencaAtivacoes (LicencaId, Status, UltimoHeartbeatUtc DESC);
