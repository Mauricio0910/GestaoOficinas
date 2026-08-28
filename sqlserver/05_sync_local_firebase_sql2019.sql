/*
  GestãoOficinas Pro
  SQL Server 2019 - camada local Firestore -> SQL Server + Licenciamento

  Execute no banco local usado pelo ERP Delphi.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'goerp')
BEGIN
    EXEC(N'CREATE SCHEMA goerp');
END
GO

IF OBJECT_ID(N'goerp.SyncDocumentos', N'U') IS NULL
BEGIN
    CREATE TABLE goerp.SyncDocumentos (
        id_sync_doc BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_goerp_SyncDocumentos PRIMARY KEY,
        tenant_id NVARCHAR(80) NOT NULL,
        colecao NVARCHAR(80) NOT NULL,
        doc_id NVARCHAR(160) NOT NULL,
        payload_json NVARCHAR(MAX) NOT NULL,
        hash_payload NVARCHAR(64) NOT NULL,
        ativo BIT NOT NULL CONSTRAINT DF_goerp_SyncDocumentos_ativo DEFAULT (1),
        atualizado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_SyncDocumentos_atualizado DEFAULT SYSUTCDATETIME(),
        recebido_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_SyncDocumentos_recebido DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_goerp_SyncDocumentos_json CHECK (ISJSON(payload_json) = 1),
        CONSTRAINT UQ_goerp_SyncDocumentos UNIQUE (tenant_id, colecao, doc_id)
    );
END
GO

IF OBJECT_ID(N'goerp.SyncControle', N'U') IS NULL
BEGIN
    CREATE TABLE goerp.SyncControle (
        chave NVARCHAR(120) NOT NULL CONSTRAINT PK_goerp_SyncControle PRIMARY KEY,
        valor NVARCHAR(MAX) NULL,
        atualizado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_SyncControle_atualizado DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID(N'goerp.SyncEventos', N'U') IS NULL
BEGIN
    CREATE TABLE goerp.SyncEventos (
        id_evento BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_goerp_SyncEventos PRIMARY KEY,
        tenant_id NVARCHAR(80) NOT NULL,
        origem NVARCHAR(40) NOT NULL,
        tipo_evento NVARCHAR(80) NOT NULL,
        entidade NVARCHAR(80) NULL,
        entidade_id NVARCHAR(160) NULL,
        payload_json NVARCHAR(MAX) NULL,
        status_evento NVARCHAR(30) NOT NULL CONSTRAINT DF_goerp_SyncEventos_status DEFAULT N'PENDENTE',
        mensagem NVARCHAR(4000) NULL,
        criado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_SyncEventos_criado DEFAULT SYSUTCDATETIME(),
        processado_em_utc DATETIME2(0) NULL,
        CONSTRAINT CK_goerp_SyncEventos_json CHECK (payload_json IS NULL OR ISJSON(payload_json) = 1)
    );
END
GO

IF OBJECT_ID(N'goerp.LicencasProduto', N'U') IS NULL
BEGIN
    CREATE TABLE goerp.LicencasProduto (
        id_licenca UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_goerp_LicencasProduto PRIMARY KEY DEFAULT NEWID(),
        tenant_id NVARCHAR(80) NOT NULL,
        produto_codigo NVARCHAR(60) NOT NULL,
        cnpj NVARCHAR(20) NULL,
        razao_social NVARCHAR(180) NULL,
        chave_licenca NVARCHAR(120) NOT NULL,
        plano NVARCHAR(40) NOT NULL CONSTRAINT DF_goerp_LicencasProduto_plano DEFAULT N'PRO',
        status_licenca NVARCHAR(30) NOT NULL CONSTRAINT DF_goerp_LicencasProduto_status DEFAULT N'ATIVA',
        limite_usuarios INT NULL,
        limite_filiais INT NULL,
        validade_inicio DATE NOT NULL CONSTRAINT DF_goerp_LicencasProduto_inicio DEFAULT CONVERT(DATE, GETDATE()),
        validade_fim DATE NULL,
        criado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_LicencasProduto_criado DEFAULT SYSUTCDATETIME(),
        atualizado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_LicencasProduto_atualizado DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_goerp_LicencasProduto UNIQUE (tenant_id, produto_codigo, chave_licenca)
    );
END
GO

IF OBJECT_ID(N'goerp.LicencaValidacoes', N'U') IS NULL
BEGIN
    CREATE TABLE goerp.LicencaValidacoes (
        id_validacao BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_goerp_LicencaValidacoes PRIMARY KEY,
        tenant_id NVARCHAR(80) NOT NULL,
        produto_codigo NVARCHAR(60) NOT NULL,
        chave_licenca NVARCHAR(120) NULL,
        cnpj NVARCHAR(20) NULL,
        dispositivo_id NVARCHAR(120) NULL,
        versao_app NVARCHAR(40) NULL,
        resultado NVARCHAR(40) NOT NULL,
        mensagem NVARCHAR(4000) NULL,
        criado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_LicencaValidacoes_criado DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID(N'goerp.uspGO_UpsertSyncDocumento', N'P') IS NOT NULL
    DROP PROCEDURE goerp.uspGO_UpsertSyncDocumento;
GO

CREATE PROCEDURE goerp.uspGO_UpsertSyncDocumento
    @TenantId NVARCHAR(80),
    @Colecao NVARCHAR(80),
    @DocId NVARCHAR(160),
    @PayloadJson NVARCHAR(MAX),
    @HashPayload NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;

    IF ISJSON(@PayloadJson) <> 1
    BEGIN
        THROW 51000, 'PayloadJson inválido. O conteúdo precisa ser JSON.', 1;
    END;

    MERGE goerp.SyncDocumentos AS alvo
    USING (
        SELECT @TenantId tenant_id, @Colecao colecao, @DocId doc_id, @PayloadJson payload_json, @HashPayload hash_payload
    ) AS origem
    ON alvo.tenant_id = origem.tenant_id
       AND alvo.colecao = origem.colecao
       AND alvo.doc_id = origem.doc_id
    WHEN MATCHED AND ISNULL(alvo.hash_payload, '') <> ISNULL(origem.hash_payload, '') THEN
        UPDATE SET
            payload_json = origem.payload_json,
            hash_payload = origem.hash_payload,
            ativo = 1,
            atualizado_em_utc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (tenant_id, colecao, doc_id, payload_json, hash_payload)
        VALUES (origem.tenant_id, origem.colecao, origem.doc_id, origem.payload_json, origem.hash_payload);
END
GO

IF OBJECT_ID(N'goerp.uspGO_ValidarLicencaLocal', N'P') IS NOT NULL
    DROP PROCEDURE goerp.uspGO_ValidarLicencaLocal;
GO

CREATE PROCEDURE goerp.uspGO_ValidarLicencaLocal
    @TenantId NVARCHAR(80),
    @ProdutoCodigo NVARCHAR(60),
    @ChaveLicenca NVARCHAR(120),
    @Cnpj NVARCHAR(20) = NULL,
    @DispositivoId NVARCHAR(120) = NULL,
    @VersaoApp NVARCHAR(40) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Status NVARCHAR(30), @ValidadeFim DATE, @Plano NVARCHAR(40),
            @LicencaValida BIT = 0, @Mensagem NVARCHAR(4000);

    SELECT TOP (1)
        @Status = status_licenca,
        @ValidadeFim = validade_fim,
        @Plano = plano
    FROM goerp.LicencasProduto
    WHERE tenant_id = @TenantId
      AND produto_codigo = @ProdutoCodigo
      AND chave_licenca = @ChaveLicenca
      AND (@Cnpj IS NULL OR cnpj IS NULL OR cnpj = @Cnpj);

    IF @Status IS NULL
    BEGIN
        SET @Status = N'NAO_ENCONTRADA';
        SET @Mensagem = N'Licença não encontrada.';
    END
    ELSE IF @Status <> N'ATIVA'
    BEGIN
        SET @Mensagem = N'Licença não está ativa.';
    END
    ELSE IF @ValidadeFim IS NOT NULL AND @ValidadeFim < CONVERT(DATE, GETDATE())
    BEGIN
        SET @Status = N'EXPIRADA';
        SET @Mensagem = N'Licença expirada.';
    END
    ELSE
    BEGIN
        SET @LicencaValida = 1;
        SET @Mensagem = N'Licença válida.';
    END;

    INSERT INTO goerp.LicencaValidacoes
        (tenant_id, produto_codigo, chave_licenca, cnpj, dispositivo_id, versao_app, resultado, mensagem)
    VALUES
        (@TenantId, @ProdutoCodigo, @ChaveLicenca, @Cnpj, @DispositivoId, @VersaoApp, @Status, @Mensagem);

    SELECT
        @LicencaValida AS licenca_valida,
        @Status AS status_licenca,
        @Mensagem AS mensagem,
        @TenantId AS tenant_id,
        @ProdutoCodigo AS produto_codigo,
        @ValidadeFim AS validade_fim,
        @Plano AS plano;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM goerp.LicencasProduto
    WHERE tenant_id = N'oficina_demo'
      AND produto_codigo = N'GESTAO_OFICINAS_PRO'
      AND chave_licenca = N'GO-PRO-DEMO-2026'
)
BEGIN
    INSERT INTO goerp.LicencasProduto
        (tenant_id, produto_codigo, cnpj, razao_social, chave_licenca, plano, status_licenca, limite_usuarios, limite_filiais, validade_fim)
    VALUES
        (N'oficina_demo', N'GESTAO_OFICINAS_PRO', NULL, N'Oficina Demo', N'GO-PRO-DEMO-2026', N'PRO', N'ATIVA', 10, 1, DATEADD(DAY, 365, CONVERT(DATE, GETDATE())));
END
GO

IF OBJECT_ID(N'goerp.vwGO_FirebaseClientes', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseClientes;
GO
CREATE VIEW goerp.vwGO_FirebaseClientes AS
SELECT
    d.tenant_id,
    d.doc_id AS id_cliente,
    COALESCE(JSON_VALUE(d.payload_json, '$.nome'), JSON_VALUE(d.payload_json, '$.nome_razao')) AS nome,
    COALESCE(JSON_VALUE(d.payload_json, '$.cpfCnpj'), JSON_VALUE(d.payload_json, '$.cpf_cnpj')) AS cpf_cnpj,
    JSON_VALUE(d.payload_json, '$.telefone') AS telefone,
    JSON_VALUE(d.payload_json, '$.whatsapp') AS whatsapp,
    JSON_VALUE(d.payload_json, '$.email') AS email,
    JSON_VALUE(d.payload_json, '$.endereco') AS endereco,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao = N'clientes' AND d.ativo = 1;
GO

IF OBJECT_ID(N'goerp.vwGO_FirebaseVeiculos', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseVeiculos;
GO
CREATE VIEW goerp.vwGO_FirebaseVeiculos AS
SELECT
    d.tenant_id,
    d.doc_id AS id_veiculo,
    COALESCE(JSON_VALUE(d.payload_json, '$.clienteId'), JSON_VALUE(d.payload_json, '$.cliente_id')) AS id_cliente,
    JSON_VALUE(d.payload_json, '$.placa') AS placa,
    COALESCE(JSON_VALUE(d.payload_json, '$.tipoVeiculo'), JSON_VALUE(d.payload_json, '$.tipo_veiculo')) AS tipo_veiculo,
    JSON_VALUE(d.payload_json, '$.marca') AS marca,
    JSON_VALUE(d.payload_json, '$.modelo') AS modelo,
    COALESCE(TRY_CONVERT(INT, JSON_VALUE(d.payload_json, '$.anoModelo')), TRY_CONVERT(INT, JSON_VALUE(d.payload_json, '$.ano'))) AS ano_modelo,
    JSON_VALUE(d.payload_json, '$.cor') AS cor,
    TRY_CONVERT(INT, JSON_VALUE(d.payload_json, '$.km')) AS km,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao = N'veiculos' AND d.ativo = 1;
GO

IF OBJECT_ID(N'goerp.vwGO_FirebaseOrdensServico', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseOrdensServico;
GO
CREATE VIEW goerp.vwGO_FirebaseOrdensServico AS
SELECT
    d.tenant_id,
    d.doc_id AS id_os,
    JSON_VALUE(d.payload_json, '$.numero') AS numero_os,
    JSON_VALUE(d.payload_json, '$.clienteId') AS id_cliente,
    JSON_VALUE(d.payload_json, '$.veiculoId') AS id_veiculo,
    JSON_VALUE(d.payload_json, '$.status') AS status_os,
    JSON_VALUE(d.payload_json, '$.tipoVeiculo') AS tipo_veiculo,
    JSON_VALUE(d.payload_json, '$.reclamacaoCliente') AS reclamacao_cliente,
    JSON_VALUE(d.payload_json, '$.diagnosticoTecnico') AS diagnostico_tecnico,
    TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(d.payload_json, '$.valorTotal')) AS valor_total,
    TRY_CONVERT(DATETIME2(0), JSON_VALUE(d.payload_json, '$.dataAbertura')) AS data_abertura,
    TRY_CONVERT(DATETIME2(0), JSON_VALUE(d.payload_json, '$.dataFechamento')) AS data_fechamento,
    TRY_CONVERT(INT, JSON_VALUE(d.payload_json, '$.inspecaoTecnica.totalPartes')) AS total_partes_inspecionadas,
    TRY_CONVERT(INT, JSON_VALUE(d.payload_json, '$.inspecaoTecnica.pendencias')) AS pendencias_inspecao,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao IN (N'ordens', N'ordensServico') AND d.ativo = 1;
GO

IF OBJECT_ID(N'goerp.vwGO_FirebaseInspecaoTecnica', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseInspecaoTecnica;
GO
CREATE VIEW goerp.vwGO_FirebaseInspecaoTecnica AS
SELECT
    d.tenant_id,
    d.doc_id AS id_os,
    JSON_VALUE(d.payload_json, '$.numero') AS numero_os,
    p.parte,
    p.defeito,
    p.gravidade,
    p.status_item,
    p.observacao,
    p.peca,
    p.servico,
    TRY_CONVERT(DECIMAL(18,2), p.valor_servico) AS valor_servico,
    TRY_CONVERT(DATETIME2(0), JSON_VALUE(d.payload_json, '$.inspecaoTecnica.atualizadoEm')) AS inspecao_atualizada_em,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
CROSS APPLY OPENJSON(JSON_QUERY(d.payload_json, '$.inspecaoTecnica.partes'))
WITH (
    parte NVARCHAR(120) '$.parte',
    defeito NVARCHAR(120) '$.defeito',
    gravidade NVARCHAR(40) '$.gravidade',
    status_item NVARCHAR(40) '$.status',
    observacao NVARCHAR(2000) '$.observacao',
    peca NVARCHAR(180) '$.peca',
    servico NVARCHAR(180) '$.servico',
    valor_servico NVARCHAR(40) '$.valor'
) p
WHERE d.colecao IN (N'ordens', N'ordensServico') AND d.ativo = 1;
GO

IF OBJECT_ID(N'goerp.vwGO_FirebaseServicosAExecutar', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseServicosAExecutar;
GO
CREATE VIEW goerp.vwGO_FirebaseServicosAExecutar AS
SELECT
    tenant_id, id_os, numero_os, parte, defeito, gravidade, status_item,
    servico AS descricao_servico, peca AS peca_relacionada, valor_servico, atualizado_em_utc
FROM goerp.vwGO_FirebaseInspecaoTecnica
WHERE ISNULL(servico, N'') <> N'';
GO

IF OBJECT_ID(N'goerp.vwGO_FirebaseDashboardOficina', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseDashboardOficina;
GO
CREATE VIEW goerp.vwGO_FirebaseDashboardOficina AS
SELECT
    tenant_id,
    COUNT(1) AS total_os,
    SUM(CASE WHEN status_os IN (N'ABERTA', N'EM_DIAGNOSTICO', N'EM EXECUCAO', N'EM_EXECUCAO') THEN 1 ELSE 0 END) AS os_abertas_execucao,
    SUM(CASE WHEN status_os IN (N'FINALIZADA', N'FATURADA') THEN 1 ELSE 0 END) AS os_finalizadas,
    SUM(ISNULL(valor_total, 0)) AS valor_total_os,
    SUM(ISNULL(pendencias_inspecao, 0)) AS pendencias_inspecao
FROM goerp.vwGO_FirebaseOrdensServico
GROUP BY tenant_id;
GO

IF OBJECT_ID(N'goerp.vwGO_LicencaStatus', N'V') IS NOT NULL DROP VIEW goerp.vwGO_LicencaStatus;
GO
CREATE VIEW goerp.vwGO_LicencaStatus AS
SELECT
    tenant_id, produto_codigo, cnpj, razao_social, plano, status_licenca,
    validade_inicio, validade_fim,
    CASE
        WHEN status_licenca <> N'ATIVA' THEN CAST(0 AS BIT)
        WHEN validade_fim IS NOT NULL AND validade_fim < CONVERT(DATE, GETDATE()) THEN CAST(0 AS BIT)
        ELSE CAST(1 AS BIT)
    END AS licenca_valida,
    limite_usuarios, limite_filiais, criado_em_utc, atualizado_em_utc
FROM goerp.LicencasProduto;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_goerp_SyncDocumentos_Colecao' AND object_id = OBJECT_ID(N'goerp.SyncDocumentos'))
BEGIN
    CREATE INDEX IX_goerp_SyncDocumentos_Colecao
    ON goerp.SyncDocumentos (tenant_id, colecao, atualizado_em_utc DESC)
    INCLUDE (doc_id, ativo);
END
GO
