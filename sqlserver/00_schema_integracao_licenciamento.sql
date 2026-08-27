/*
  GestãoOficinas Pro - SQL Server 2019
  Script 00 - Schema de integração e licenciamento

  Objetivo:
  - Criar uma camada de espelho SQL Server para integração com ERP Delphi.
  - A API de integração pode gravar/sincronizar dados nesta camada.
  - O ERP Delphi consome preferencialmente as views do script 01.

  Observação:
  - Ajuste filegroups, collations e políticas de backup conforme seu ambiente.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'goerp')
    EXEC('CREATE SCHEMA goerp');
GO

CREATE TABLE goerp.Clientes (
    ClienteId           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_Clientes PRIMARY KEY,
    TenantId            NVARCHAR(80) NOT NULL,
    TipoPessoa          CHAR(1) NOT NULL CONSTRAINT CK_GOERP_Clientes_TipoPessoa CHECK (TipoPessoa IN ('F','J')),
    NomeRazao           NVARCHAR(160) NOT NULL,
    CpfCnpj             NVARCHAR(20) NULL,
    Telefone            NVARCHAR(30) NULL,
    Whatsapp            NVARCHAR(30) NULL,
    Email               NVARCHAR(160) NULL,
    Endereco            NVARCHAR(400) NULL,
    ConsentimentoLgpd   BIT NOT NULL CONSTRAINT DF_GOERP_Clientes_LGPD DEFAULT 0,
    Ativo               BIT NOT NULL CONSTRAINT DF_GOERP_Clientes_Ativo DEFAULT 1,
    Origem              NVARCHAR(30) NOT NULL CONSTRAINT DF_GOERP_Clientes_Origem DEFAULT 'FIREBASE',
    CriadoEmUtc         DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Clientes_Criado DEFAULT SYSUTCDATETIME(),
    AtualizadoEmUtc     DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Clientes_Atualizado DEFAULT SYSUTCDATETIME(),
    RowVersion          ROWVERSION
);
GO

CREATE TABLE goerp.Veiculos (
    VeiculoId           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_Veiculos PRIMARY KEY,
    TenantId            NVARCHAR(80) NOT NULL,
    ClienteId           UNIQUEIDENTIFIER NOT NULL,
    TipoVeiculo         NVARCHAR(30) NOT NULL,
    Placa               NVARCHAR(10) NULL,
    Chassi              NVARCHAR(40) NULL,
    Renavam             NVARCHAR(30) NULL,
    Marca               NVARCHAR(80) NULL,
    Modelo              NVARCHAR(120) NULL,
    AnoFabricacao       INT NULL,
    AnoModelo           INT NULL,
    Cor                 NVARCHAR(60) NULL,
    Combustivel         NVARCHAR(60) NULL,
    KmAtual             INT NULL,
    OrigemDados         NVARCHAR(30) NOT NULL CONSTRAINT DF_GOERP_Veiculos_Origem DEFAULT 'APP',
    CriadoEmUtc         DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Veiculos_Criado DEFAULT SYSUTCDATETIME(),
    AtualizadoEmUtc     DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Veiculos_Atualizado DEFAULT SYSUTCDATETIME(),
    RowVersion          ROWVERSION,
    CONSTRAINT FK_GOERP_Veiculos_Clientes FOREIGN KEY (ClienteId) REFERENCES goerp.Clientes(ClienteId)
);
GO

CREATE TABLE goerp.OrdensServico (
    OrdemServicoId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_OrdensServico PRIMARY KEY,
    TenantId            NVARCHAR(80) NOT NULL,
    Numero              BIGINT NULL,
    ClienteId           UNIQUEIDENTIFIER NOT NULL,
    VeiculoId           UNIQUEIDENTIFIER NOT NULL,
    Status              NVARCHAR(40) NOT NULL,
    KmEntrada           INT NULL,
    ReclamacaoCliente   NVARCHAR(MAX) NULL,
    DiagnosticoTecnico  NVARCHAR(MAX) NULL,
    TipoVeiculo         NVARCHAR(30) NULL,
    PrevisaoEntrega     DATETIME2(0) NULL,
    DataAberturaUtc     DATETIME2(0) NOT NULL,
    DataFechamentoUtc   DATETIME2(0) NULL,
    AprovadoEmUtc       DATETIME2(0) NULL,
    FaturadoEmUtc       DATETIME2(0) NULL,
    ValorServicos       DECIMAL(18,2) NOT NULL CONSTRAINT DF_GOERP_OS_ValorServ DEFAULT 0,
    ValorPecas          DECIMAL(18,2) NOT NULL CONSTRAINT DF_GOERP_OS_ValorPeca DEFAULT 0,
    ValorTotal          AS (ValorServicos + ValorPecas) PERSISTED,
    CriadoPorNome       NVARCHAR(120) NULL,
    CriadoEmUtc         DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_OS_Criado DEFAULT SYSUTCDATETIME(),
    AtualizadoEmUtc     DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_OS_Atualizado DEFAULT SYSUTCDATETIME(),
    RowVersion          ROWVERSION,
    CONSTRAINT FK_GOERP_OS_Clientes FOREIGN KEY (ClienteId) REFERENCES goerp.Clientes(ClienteId),
    CONSTRAINT FK_GOERP_OS_Veiculos FOREIGN KEY (VeiculoId) REFERENCES goerp.Veiculos(VeiculoId)
);
GO

CREATE TABLE goerp.OrdemServicoServicos (
    OrdemServicoServicoId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_OSServicos PRIMARY KEY,
    OrdemServicoId        UNIQUEIDENTIFIER NOT NULL,
    ServicoIdOrigem       NVARCHAR(80) NULL,
    ParteVeiculo          NVARCHAR(120) NULL,
    Descricao             NVARCHAR(200) NOT NULL,
    MecanicoNome          NVARCHAR(120) NULL,
    Quantidade            DECIMAL(18,3) NOT NULL CONSTRAINT DF_GOERP_OSServ_Qtd DEFAULT 1,
    ValorUnitario         DECIMAL(18,2) NOT NULL,
    ValorTotal            AS (Quantidade * ValorUnitario) PERSISTED,
    PercentualComissao    DECIMAL(9,4) NOT NULL CONSTRAINT DF_GOERP_OSServ_Comissao DEFAULT 0,
    StatusServico         NVARCHAR(40) NOT NULL CONSTRAINT DF_GOERP_OSServ_Status DEFAULT 'A_EXECUTAR',
    CriadoEmUtc           DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_OSServ_Criado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_GOERP_OSServicos_OS FOREIGN KEY (OrdemServicoId) REFERENCES goerp.OrdensServico(OrdemServicoId) ON DELETE CASCADE
);
GO

CREATE TABLE goerp.OrdemServicoPecas (
    OrdemServicoPecaId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_OSPecas PRIMARY KEY,
    OrdemServicoId     UNIQUEIDENTIFIER NOT NULL,
    PecaIdOrigem       NVARCHAR(80) NULL,
    ParteVeiculo       NVARCHAR(120) NULL,
    Sku                NVARCHAR(80) NULL,
    Descricao          NVARCHAR(200) NOT NULL,
    Quantidade         DECIMAL(18,3) NOT NULL CONSTRAINT DF_GOERP_OSPeca_Qtd DEFAULT 1,
    ValorUnitario      DECIMAL(18,2) NOT NULL,
    ValorTotal         AS (Quantidade * ValorUnitario) PERSISTED,
    CriadoEmUtc        DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_OSPeca_Criado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_GOERP_OSPecas_OS FOREIGN KEY (OrdemServicoId) REFERENCES goerp.OrdensServico(OrdemServicoId) ON DELETE CASCADE
);
GO

CREATE TABLE goerp.InspecaoTecnicaPartes (
    InspecaoParteId    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_InspecaoPartes PRIMARY KEY,
    OrdemServicoId     UNIQUEIDENTIFIER NOT NULL,
    TenantId           NVARCHAR(80) NOT NULL,
    TipoVeiculo        NVARCHAR(30) NOT NULL,
    ParteKey           NVARCHAR(80) NOT NULL,
    ParteDescricao     NVARCHAR(160) NOT NULL,
    Defeito            NVARCHAR(80) NULL,
    Gravidade          NVARCHAR(30) NULL,
    StatusAnalise      NVARCHAR(40) NULL,
    ObservacaoTecnica  NVARCHAR(MAX) NULL,
    FotoUrl            NVARCHAR(600) NULL,
    ServicoSugerido    NVARCHAR(200) NULL,
    ServicoCustomizado NVARCHAR(200) NULL,
    StatusServico      NVARCHAR(40) NULL,
    PosX               DECIMAL(9,4) NULL,
    PosY               DECIMAL(9,4) NULL,
    AtualizadoEmUtc    DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Inspecao_Atualizado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_GOERP_Inspecao_OS FOREIGN KEY (OrdemServicoId) REFERENCES goerp.OrdensServico(OrdemServicoId) ON DELETE CASCADE
);
GO

CREATE TABLE goerp.CatalogoPartesVeiculo (
    CatalogoParteId    UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_CatalogoPartes PRIMARY KEY,
    TenantId           NVARCHAR(80) NOT NULL,
    TipoVeiculo        NVARCHAR(30) NOT NULL,
    ParteKey           NVARCHAR(80) NOT NULL,
    ParteDescricao     NVARCHAR(160) NOT NULL,
    Grupo              NVARCHAR(80) NULL,
    Ativo              BIT NOT NULL CONSTRAINT DF_GOERP_CatPartes_Ativo DEFAULT 1,
    CONSTRAINT UQ_GOERP_CatalogoPartes UNIQUE (TenantId, TipoVeiculo, ParteKey)
);
GO

CREATE TABLE goerp.CatalogoPecas (
    CatalogoPecaId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_CatalogoPecas PRIMARY KEY,
    TenantId           NVARCHAR(80) NOT NULL,
    TipoVeiculo        NVARCHAR(30) NOT NULL,
    ParteKey           NVARCHAR(80) NULL,
    Sku                NVARCHAR(80) NULL,
    Descricao          NVARCHAR(200) NOT NULL,
    ValorPadrao        DECIMAL(18,2) NULL,
    Ativo              BIT NOT NULL CONSTRAINT DF_GOERP_CatPecas_Ativo DEFAULT 1
);
GO

CREATE TABLE goerp.CatalogoServicos (
    CatalogoServicoId  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_CatalogoServicos PRIMARY KEY,
    TenantId           NVARCHAR(80) NOT NULL,
    TipoVeiculo        NVARCHAR(30) NOT NULL,
    ParteKey           NVARCHAR(80) NULL,
    Descricao          NVARCHAR(200) NOT NULL,
    TempoEstimadoMin   INT NULL,
    ValorPadrao        DECIMAL(18,2) NULL,
    PercentualComissao DECIMAL(9,4) NULL,
    Ativo              BIT NOT NULL CONSTRAINT DF_GOERP_CatServ_Ativo DEFAULT 1
);
GO

CREATE TABLE goerp.SyncEventos (
    SyncEventoId       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GOERP_SyncEventos PRIMARY KEY,
    TenantId           NVARCHAR(80) NOT NULL,
    Entidade           NVARCHAR(80) NOT NULL,
    EntidadeId         NVARCHAR(80) NOT NULL,
    Operacao           NVARCHAR(20) NOT NULL,
    Origem             NVARCHAR(30) NOT NULL,
    PayloadJson        NVARCHAR(MAX) NULL,
    Processado         BIT NOT NULL CONSTRAINT DF_GOERP_Sync_Processado DEFAULT 0,
    Tentativas         INT NOT NULL CONSTRAINT DF_GOERP_Sync_Tentativas DEFAULT 0,
    Erro               NVARCHAR(MAX) NULL,
    CriadoEmUtc        DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Sync_Criado DEFAULT SYSUTCDATETIME(),
    ProcessadoEmUtc    DATETIME2(0) NULL
);
GO

CREATE TABLE goerp.LicencasProduto (
    LicencaId          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_Licencas PRIMARY KEY,
    ProdutoCodigo      NVARCHAR(80) NOT NULL,
    TenantId           NVARCHAR(80) NOT NULL,
    CnpjCliente        NVARCHAR(20) NULL,
    RazaoSocial        NVARCHAR(160) NULL,
    ChaveLicencaHash   VARBINARY(32) NOT NULL,
    Plano              NVARCHAR(40) NOT NULL,
    Status             NVARCHAR(30) NOT NULL CONSTRAINT DF_GOERP_Licencas_Status DEFAULT 'ATIVA',
    MaxDispositivos    INT NOT NULL CONSTRAINT DF_GOERP_Licencas_MaxDisp DEFAULT 5,
    MaxFiliais         INT NOT NULL CONSTRAINT DF_GOERP_Licencas_MaxFiliais DEFAULT 1,
    ValidaDeUtc        DATETIME2(0) NOT NULL,
    ValidaAteUtc       DATETIME2(0) NULL,
    CriadoEmUtc        DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Licencas_Criado DEFAULT SYSUTCDATETIME(),
    AtualizadoEmUtc    DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_Licencas_Atualizado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_GOERP_Licencas_ProdutoTenant UNIQUE (ProdutoCodigo, TenantId)
);
GO

CREATE TABLE goerp.LicencaAtivacoes (
    AtivacaoId         UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GOERP_LicencaAtivacoes PRIMARY KEY,
    LicencaId          UNIQUEIDENTIFIER NOT NULL,
    DeviceId           NVARCHAR(120) NOT NULL,
    Plataforma         NVARCHAR(40) NULL,
    AppVersion         NVARCHAR(40) NULL,
    PrimeiroAcessoUtc  DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_LicAtiv_Primeiro DEFAULT SYSUTCDATETIME(),
    UltimoHeartbeatUtc DATETIME2(0) NULL,
    Status             NVARCHAR(30) NOT NULL CONSTRAINT DF_GOERP_LicAtiv_Status DEFAULT 'ATIVA',
    CONSTRAINT FK_GOERP_LicAtiv_Licenca FOREIGN KEY (LicencaId) REFERENCES goerp.LicencasProduto(LicencaId) ON DELETE CASCADE,
    CONSTRAINT UQ_GOERP_LicAtiv_Device UNIQUE (LicencaId, DeviceId)
);
GO

CREATE TABLE goerp.LicencaEventos (
    LicencaEventoId    BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GOERP_LicEventos PRIMARY KEY,
    LicencaId          UNIQUEIDENTIFIER NULL,
    TenantId           NVARCHAR(80) NULL,
    DeviceId           NVARCHAR(120) NULL,
    Evento             NVARCHAR(60) NOT NULL,
    Resultado          NVARCHAR(30) NOT NULL,
    Mensagem           NVARCHAR(400) NULL,
    IpOrigem           NVARCHAR(60) NULL,
    UserAgent          NVARCHAR(600) NULL,
    CriadoEmUtc        DATETIME2(0) NOT NULL CONSTRAINT DF_GOERP_LicEventos_Criado DEFAULT SYSUTCDATETIME()
);
GO
