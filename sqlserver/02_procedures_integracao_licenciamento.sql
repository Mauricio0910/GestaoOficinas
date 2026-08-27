/*
  GestãoOficinas Pro - SQL Server 2019
  Script 02 - Procedures de upsert, sync e licenciamento
  Versão corrigida: compatível sem CREATE OR ALTER
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'goerp.spGO_RegistrarSyncEvento', N'P') IS NOT NULL
    DROP PROCEDURE goerp.spGO_RegistrarSyncEvento;
GO
CREATE PROCEDURE goerp.spGO_RegistrarSyncEvento
    @TenantId NVARCHAR(80),
    @Entidade NVARCHAR(80),
    @EntidadeId NVARCHAR(80),
    @Operacao NVARCHAR(20),
    @Origem NVARCHAR(30),
    @PayloadJson NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO goerp.SyncEventos (TenantId, Entidade, EntidadeId, Operacao, Origem, PayloadJson)
    VALUES (@TenantId, @Entidade, @EntidadeId, @Operacao, @Origem, @PayloadJson);
END;
GO

IF OBJECT_ID(N'goerp.spGO_UpsertCliente', N'P') IS NOT NULL
    DROP PROCEDURE goerp.spGO_UpsertCliente;
GO
CREATE PROCEDURE goerp.spGO_UpsertCliente
    @ClienteId UNIQUEIDENTIFIER,
    @TenantId NVARCHAR(80),
    @TipoPessoa CHAR(1),
    @NomeRazao NVARCHAR(160),
    @CpfCnpj NVARCHAR(20) = NULL,
    @Telefone NVARCHAR(30) = NULL,
    @Whatsapp NVARCHAR(30) = NULL,
    @Email NVARCHAR(160) = NULL,
    @Endereco NVARCHAR(400) = NULL,
    @ConsentimentoLgpd BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    MERGE goerp.Clientes AS T
    USING (SELECT @ClienteId AS ClienteId) AS S
    ON T.ClienteId = S.ClienteId
    WHEN MATCHED THEN UPDATE SET
        TenantId = @TenantId,
        TipoPessoa = @TipoPessoa,
        NomeRazao = @NomeRazao,
        CpfCnpj = @CpfCnpj,
        Telefone = @Telefone,
        Whatsapp = @Whatsapp,
        Email = @Email,
        Endereco = @Endereco,
        ConsentimentoLgpd = @ConsentimentoLgpd,
        AtualizadoEmUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT
        (ClienteId, TenantId, TipoPessoa, NomeRazao, CpfCnpj, Telefone, Whatsapp, Email, Endereco, ConsentimentoLgpd)
        VALUES
        (@ClienteId, @TenantId, @TipoPessoa, @NomeRazao, @CpfCnpj, @Telefone, @Whatsapp, @Email, @Endereco, @ConsentimentoLgpd);
END;
GO

IF OBJECT_ID(N'goerp.spGO_UpsertVeiculo', N'P') IS NOT NULL
    DROP PROCEDURE goerp.spGO_UpsertVeiculo;
GO
CREATE PROCEDURE goerp.spGO_UpsertVeiculo
    @VeiculoId UNIQUEIDENTIFIER,
    @TenantId NVARCHAR(80),
    @ClienteId UNIQUEIDENTIFIER,
    @TipoVeiculo NVARCHAR(30),
    @Placa NVARCHAR(10) = NULL,
    @Chassi NVARCHAR(40) = NULL,
    @Renavam NVARCHAR(30) = NULL,
    @Marca NVARCHAR(80) = NULL,
    @Modelo NVARCHAR(120) = NULL,
    @AnoFabricacao INT = NULL,
    @AnoModelo INT = NULL,
    @Cor NVARCHAR(60) = NULL,
    @Combustivel NVARCHAR(60) = NULL,
    @KmAtual INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    MERGE goerp.Veiculos AS T
    USING (SELECT @VeiculoId AS VeiculoId) AS S
    ON T.VeiculoId = S.VeiculoId
    WHEN MATCHED THEN UPDATE SET
        TenantId = @TenantId,
        ClienteId = @ClienteId,
        TipoVeiculo = @TipoVeiculo,
        Placa = @Placa,
        Chassi = @Chassi,
        Renavam = @Renavam,
        Marca = @Marca,
        Modelo = @Modelo,
        AnoFabricacao = @AnoFabricacao,
        AnoModelo = @AnoModelo,
        Cor = @Cor,
        Combustivel = @Combustivel,
        KmAtual = @KmAtual,
        AtualizadoEmUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT
        (VeiculoId, TenantId, ClienteId, TipoVeiculo, Placa, Chassi, Renavam, Marca, Modelo, AnoFabricacao, AnoModelo, Cor, Combustivel, KmAtual)
        VALUES
        (@VeiculoId, @TenantId, @ClienteId, @TipoVeiculo, @Placa, @Chassi, @Renavam, @Marca, @Modelo, @AnoFabricacao, @AnoModelo, @Cor, @Combustivel, @KmAtual);
END;
GO

IF OBJECT_ID(N'goerp.spGO_UpsertOrdemServico', N'P') IS NOT NULL
    DROP PROCEDURE goerp.spGO_UpsertOrdemServico;
GO
CREATE PROCEDURE goerp.spGO_UpsertOrdemServico
    @OrdemServicoId UNIQUEIDENTIFIER,
    @TenantId NVARCHAR(80),
    @Numero BIGINT = NULL,
    @ClienteId UNIQUEIDENTIFIER,
    @VeiculoId UNIQUEIDENTIFIER,
    @Status NVARCHAR(40),
    @KmEntrada INT = NULL,
    @ReclamacaoCliente NVARCHAR(MAX) = NULL,
    @DiagnosticoTecnico NVARCHAR(MAX) = NULL,
    @TipoVeiculo NVARCHAR(30) = NULL,
    @DataAberturaUtc DATETIME2(0),
    @DataFechamentoUtc DATETIME2(0) = NULL,
    @CriadoPorNome NVARCHAR(120) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    MERGE goerp.OrdensServico AS T
    USING (SELECT @OrdemServicoId AS OrdemServicoId) AS S
    ON T.OrdemServicoId = S.OrdemServicoId
    WHEN MATCHED THEN UPDATE SET
        TenantId = @TenantId,
        Numero = @Numero,
        ClienteId = @ClienteId,
        VeiculoId = @VeiculoId,
        Status = @Status,
        KmEntrada = @KmEntrada,
        ReclamacaoCliente = @ReclamacaoCliente,
        DiagnosticoTecnico = @DiagnosticoTecnico,
        TipoVeiculo = @TipoVeiculo,
        DataAberturaUtc = @DataAberturaUtc,
        DataFechamentoUtc = @DataFechamentoUtc,
        CriadoPorNome = @CriadoPorNome,
        AtualizadoEmUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT
        (OrdemServicoId, TenantId, Numero, ClienteId, VeiculoId, Status, KmEntrada, ReclamacaoCliente, DiagnosticoTecnico, TipoVeiculo, DataAberturaUtc, DataFechamentoUtc, CriadoPorNome)
        VALUES
        (@OrdemServicoId, @TenantId, @Numero, @ClienteId, @VeiculoId, @Status, @KmEntrada, @ReclamacaoCliente, @DiagnosticoTecnico, @TipoVeiculo, @DataAberturaUtc, @DataFechamentoUtc, @CriadoPorNome);
END;
GO

IF OBJECT_ID(N'goerp.spGO_RegistrarInspecaoParte', N'P') IS NOT NULL
    DROP PROCEDURE goerp.spGO_RegistrarInspecaoParte;
GO
CREATE PROCEDURE goerp.spGO_RegistrarInspecaoParte
    @InspecaoParteId UNIQUEIDENTIFIER,
    @OrdemServicoId UNIQUEIDENTIFIER,
    @TenantId NVARCHAR(80),
    @TipoVeiculo NVARCHAR(30),
    @ParteKey NVARCHAR(80),
    @ParteDescricao NVARCHAR(160),
    @Defeito NVARCHAR(80) = NULL,
    @Gravidade NVARCHAR(30) = NULL,
    @StatusAnalise NVARCHAR(40) = NULL,
    @ObservacaoTecnica NVARCHAR(MAX) = NULL,
    @FotoUrl NVARCHAR(600) = NULL,
    @ServicoSugerido NVARCHAR(200) = NULL,
    @ServicoCustomizado NVARCHAR(200) = NULL,
    @StatusServico NVARCHAR(40) = NULL,
    @PosX DECIMAL(9,4) = NULL,
    @PosY DECIMAL(9,4) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    MERGE goerp.InspecaoTecnicaPartes AS T
    USING (SELECT @InspecaoParteId AS InspecaoParteId) AS S
    ON T.InspecaoParteId = S.InspecaoParteId
    WHEN MATCHED THEN UPDATE SET
        TipoVeiculo = @TipoVeiculo,
        ParteKey = @ParteKey,
        ParteDescricao = @ParteDescricao,
        Defeito = @Defeito,
        Gravidade = @Gravidade,
        StatusAnalise = @StatusAnalise,
        ObservacaoTecnica = @ObservacaoTecnica,
        FotoUrl = @FotoUrl,
        ServicoSugerido = @ServicoSugerido,
        ServicoCustomizado = @ServicoCustomizado,
        StatusServico = @StatusServico,
        PosX = @PosX,
        PosY = @PosY,
        AtualizadoEmUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT
        (InspecaoParteId, OrdemServicoId, TenantId, TipoVeiculo, ParteKey, ParteDescricao, Defeito, Gravidade, StatusAnalise, ObservacaoTecnica, FotoUrl, ServicoSugerido, ServicoCustomizado, StatusServico, PosX, PosY)
        VALUES
        (@InspecaoParteId, @OrdemServicoId, @TenantId, @TipoVeiculo, @ParteKey, @ParteDescricao, @Defeito, @Gravidade, @StatusAnalise, @ObservacaoTecnica, @FotoUrl, @ServicoSugerido, @ServicoCustomizado, @StatusServico, @PosX, @PosY);
END;
GO

IF OBJECT_ID(N'goerp.spGO_ValidarLicenca', N'P') IS NOT NULL
    DROP PROCEDURE goerp.spGO_ValidarLicenca;
GO
CREATE PROCEDURE goerp.spGO_ValidarLicenca
    @ProdutoCodigo NVARCHAR(80),
    @TenantId NVARCHAR(80),
    @ChaveLicenca NVARCHAR(120),
    @DeviceId NVARCHAR(120),
    @Plataforma NVARCHAR(40) = NULL,
    @AppVersion NVARCHAR(40) = NULL,
    @IpOrigem NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(600) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hash VARBINARY(32) = HASHBYTES('SHA2_256', @ChaveLicenca);
    DECLARE @LicencaId UNIQUEIDENTIFIER;
    DECLARE @Status NVARCHAR(30);
    DECLARE @ValidaAte DATETIME2(0);
    DECLARE @MaxDispositivos INT;
    DECLARE @DispositivosAtivos INT;

    SELECT
        @LicencaId = LicencaId,
        @Status = Status,
        @ValidaAte = ValidaAteUtc,
        @MaxDispositivos = MaxDispositivos
    FROM goerp.LicencasProduto
    WHERE ProdutoCodigo = @ProdutoCodigo
      AND TenantId = @TenantId
      AND ChaveLicencaHash = @Hash;

    IF @LicencaId IS NULL
    BEGIN
        INSERT INTO goerp.LicencaEventos (TenantId, DeviceId, Evento, Resultado, Mensagem, IpOrigem, UserAgent)
        VALUES (@TenantId, @DeviceId, 'VALIDAR', 'NEGADO', 'Licença não localizada', @IpOrigem, @UserAgent);

        SELECT CAST(0 AS BIT) AS Valida, 'INVALIDA' AS Status, 'Licença não localizada.' AS Mensagem, CAST(NULL AS DATETIME2(0)) AS ValidaAteUtc;
        RETURN;
    END

    IF @Status <> 'ATIVA' OR (@ValidaAte IS NOT NULL AND @ValidaAte < SYSUTCDATETIME())
    BEGIN
        INSERT INTO goerp.LicencaEventos (LicencaId, TenantId, DeviceId, Evento, Resultado, Mensagem, IpOrigem, UserAgent)
        VALUES (@LicencaId, @TenantId, @DeviceId, 'VALIDAR', 'NEGADO', 'Licença bloqueada ou expirada', @IpOrigem, @UserAgent);

        SELECT CAST(0 AS BIT) AS Valida, CASE WHEN @ValidaAte < SYSUTCDATETIME() THEN 'EXPIRADA' ELSE @Status END AS Status, 'Licença bloqueada ou expirada.' AS Mensagem, @ValidaAte AS ValidaAteUtc;
        RETURN;
    END

    SELECT @DispositivosAtivos = COUNT(*)
    FROM goerp.LicencaAtivacoes
    WHERE LicencaId = @LicencaId
      AND Status = 'ATIVA'
      AND DeviceId <> @DeviceId;

    IF @DispositivosAtivos >= @MaxDispositivos
       AND NOT EXISTS (SELECT 1 FROM goerp.LicencaAtivacoes WHERE LicencaId = @LicencaId AND DeviceId = @DeviceId AND Status = 'ATIVA')
    BEGIN
        INSERT INTO goerp.LicencaEventos (LicencaId, TenantId, DeviceId, Evento, Resultado, Mensagem, IpOrigem, UserAgent)
        VALUES (@LicencaId, @TenantId, @DeviceId, 'VALIDAR', 'NEGADO', 'Limite de dispositivos excedido', @IpOrigem, @UserAgent);

        SELECT CAST(0 AS BIT) AS Valida, 'LIMITE_EXCEDIDO' AS Status, 'Limite de dispositivos excedido.' AS Mensagem, @ValidaAte AS ValidaAteUtc;
        RETURN;
    END

    MERGE goerp.LicencaAtivacoes AS T
    USING (SELECT @LicencaId AS LicencaId, @DeviceId AS DeviceId) AS S
    ON T.LicencaId = S.LicencaId AND T.DeviceId = S.DeviceId
    WHEN MATCHED THEN UPDATE SET
        UltimoHeartbeatUtc = SYSUTCDATETIME(),
        Plataforma = COALESCE(@Plataforma, Plataforma),
        AppVersion = COALESCE(@AppVersion, AppVersion),
        Status = 'ATIVA'
    WHEN NOT MATCHED THEN INSERT
        (AtivacaoId, LicencaId, DeviceId, Plataforma, AppVersion, UltimoHeartbeatUtc)
        VALUES
        (NEWID(), @LicencaId, @DeviceId, @Plataforma, @AppVersion, SYSUTCDATETIME());

    INSERT INTO goerp.LicencaEventos (LicencaId, TenantId, DeviceId, Evento, Resultado, Mensagem, IpOrigem, UserAgent)
    VALUES (@LicencaId, @TenantId, @DeviceId, 'VALIDAR', 'PERMITIDO', 'Licença válida', @IpOrigem, @UserAgent);

    SELECT CAST(1 AS BIT) AS Valida, 'ATIVA' AS Status, 'Licença válida.' AS Mensagem, @ValidaAte AS ValidaAteUtc;
END;
GO
