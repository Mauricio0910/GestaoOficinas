
/*
  GestãoOficinas Pro
  Patch 06 - Compatibilidade SQL Server / JSON / Licenciamento local

  Objetivo:
  - Corrigir erro: ISJSON/JSON_VALUE não reconhecidos.
  - Corrigir erro: colunas de LicencasProduto inválidas.
  - Manter compatibilidade com o schema de licenciamento criado nos scripts anteriores:
      goerp.LicencasProduto (
        ProdutoCodigo, TenantId, CnpjCliente, RazaoSocial,
        ChaveLicencaHash, Plano, Status, MaxDispositivos, MaxFiliais,
        ValidaDeUtc, ValidaAteUtc, CriadoEmUtc, AtualizadoEmUtc
      )
  - Criar views Firebase com parser JSON quando o banco suportar JSON.
  - Criar views fallback sem parser JSON quando JSON não estiver disponível.

  IMPORTANTE:
  - Execute este script no banco local usado pelo ERP Delphi.
  - Se o seu SQL Server for 2019, mas as views ficarem em modo fallback,
    ajuste a compatibilidade do banco para 150 e execute este script novamente:
      ALTER DATABASE [NOME_DO_SEU_BANCO] SET COMPATIBILITY_LEVEL = 150;
*/

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

DECLARE @MajorVersion INT = TRY_CONVERT(INT, SERVERPROPERTY('ProductMajorVersion'));
DECLARE @CompatLevel INT = (
    SELECT compatibility_level
    FROM sys.databases
    WHERE name = DB_NAME()
);

SELECT
    @@VERSION AS sql_server_version,
    DB_NAME() AS database_name,
    @MajorVersion AS product_major_version,
    @CompatLevel AS compatibility_level,
    CASE WHEN ISNULL(@MajorVersion,0) >= 13 AND ISNULL(@CompatLevel,0) >= 130
         THEN 'JSON_OK'
         ELSE 'JSON_INDISPONIVEL_OU_COMPATIBILIDADE_BAIXA'
    END AS json_status;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'goerp')
BEGIN
    EXEC(N'CREATE SCHEMA goerp');
END
GO

/* =========================================================
   Tabelas de sincronização
   ========================================================= */

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
        CONSTRAINT UQ_goerp_SyncDocumentos UNIQUE (tenant_id, colecao, doc_id)
    );
END
ELSE
BEGIN
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'tenant_id') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD tenant_id NVARCHAR(80) NULL;
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'colecao') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD colecao NVARCHAR(80) NULL;
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'doc_id') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD doc_id NVARCHAR(160) NULL;
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'payload_json') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD payload_json NVARCHAR(MAX) NULL;
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'hash_payload') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD hash_payload NVARCHAR(64) NULL;
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'ativo') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD ativo BIT NOT NULL CONSTRAINT DF_goerp_SyncDocumentos_ativo2 DEFAULT (1);
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'atualizado_em_utc') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD atualizado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_SyncDocumentos_atualizado2 DEFAULT SYSUTCDATETIME();
    IF COL_LENGTH(N'goerp.SyncDocumentos', N'recebido_em_utc') IS NULL
        ALTER TABLE goerp.SyncDocumentos ADD recebido_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_SyncDocumentos_recebido2 DEFAULT SYSUTCDATETIME();
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

IF OBJECT_ID(N'goerp.LicencaValidacoesLocal', N'U') IS NULL
BEGIN
    CREATE TABLE goerp.LicencaValidacoesLocal (
        id_validacao BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_goerp_LicencaValidacoesLocal PRIMARY KEY,
        tenant_id NVARCHAR(80) NOT NULL,
        produto_codigo NVARCHAR(80) NOT NULL,
        chave_licenca NVARCHAR(120) NULL,
        cnpj NVARCHAR(20) NULL,
        dispositivo_id NVARCHAR(120) NULL,
        versao_app NVARCHAR(40) NULL,
        resultado NVARCHAR(40) NOT NULL,
        mensagem NVARCHAR(4000) NULL,
        criado_em_utc DATETIME2(0) NOT NULL CONSTRAINT DF_goerp_LicencaValidacoesLocal_criado DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================================================
   Tabela de licenças: usar/garantir schema antigo oficial
   ========================================================= */

IF OBJECT_ID(N'goerp.LicencasProduto', N'U') IS NULL
BEGIN
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
END
GO

/* =========================================================
   Procedures
   ========================================================= */

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

    IF NULLIF(LTRIM(RTRIM(@PayloadJson)), N'') IS NULL
    BEGIN
        RAISERROR('PayloadJson não pode ser vazio.', 16, 1);
        RETURN;
    END;

    MERGE goerp.SyncDocumentos AS alvo
    USING (
        SELECT @TenantId tenant_id,
               @Colecao colecao,
               @DocId doc_id,
               @PayloadJson payload_json,
               @HashPayload hash_payload
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
    @ProdutoCodigo NVARCHAR(80),
    @ChaveLicenca NVARCHAR(120),
    @Cnpj NVARCHAR(20) = NULL,
    @DispositivoId NVARCHAR(120) = NULL,
    @VersaoApp NVARCHAR(40) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hash VARBINARY(32) = HASHBYTES('SHA2_256', @ChaveLicenca);
    DECLARE @Status NVARCHAR(30), @ValidaAte DATETIME2(0), @Plano NVARCHAR(40),
            @LicencaValida BIT = 0, @Mensagem NVARCHAR(4000);

    SELECT TOP (1)
        @Status = Status,
        @ValidaAte = ValidaAteUtc,
        @Plano = Plano
    FROM goerp.LicencasProduto
    WHERE TenantId = @TenantId
      AND ProdutoCodigo = @ProdutoCodigo
      AND ChaveLicencaHash = @Hash
      AND (@Cnpj IS NULL OR CnpjCliente IS NULL OR CnpjCliente = @Cnpj);

    IF @Status IS NULL
    BEGIN
        SET @Status = N'NAO_ENCONTRADA';
        SET @Mensagem = N'Licença não encontrada.';
    END
    ELSE IF @Status <> N'ATIVA'
    BEGIN
        SET @Mensagem = N'Licença não está ativa.';
    END
    ELSE IF @ValidaAte IS NOT NULL AND @ValidaAte < SYSUTCDATETIME()
    BEGIN
        SET @Status = N'EXPIRADA';
        SET @Mensagem = N'Licença expirada.';
    END
    ELSE
    BEGIN
        SET @LicencaValida = 1;
        SET @Mensagem = N'Licença válida.';
    END;

    INSERT INTO goerp.LicencaValidacoesLocal
        (tenant_id, produto_codigo, chave_licenca, cnpj, dispositivo_id, versao_app, resultado, mensagem)
    VALUES
        (@TenantId, @ProdutoCodigo, @ChaveLicenca, @Cnpj, @DispositivoId, @VersaoApp, @Status, @Mensagem);

    SELECT
        @LicencaValida AS licenca_valida,
        @Status AS status_licenca,
        @Mensagem AS mensagem,
        @TenantId AS tenant_id,
        @ProdutoCodigo AS produto_codigo,
        CONVERT(DATE, @ValidaAte) AS validade_fim,
        @Plano AS plano;
END
GO

/* =========================================================
   Seed demo
   ========================================================= */

IF NOT EXISTS (
    SELECT 1
    FROM goerp.LicencasProduto
    WHERE ProdutoCodigo = N'GESTAO_OFICINAS_PRO'
      AND TenantId = N'oficina_demo'
)
BEGIN
    INSERT INTO goerp.LicencasProduto
        (LicencaId, ProdutoCodigo, TenantId, CnpjCliente, RazaoSocial, ChaveLicencaHash, Plano, Status, MaxDispositivos, MaxFiliais, ValidaDeUtc, ValidaAteUtc)
    VALUES
        (NEWID(), N'GESTAO_OFICINAS_PRO', N'oficina_demo', NULL, N'Oficina Demo',
         HASHBYTES('SHA2_256', N'GO-PRO-DEMO-2026'), N'PRO', N'ATIVA', 10, 1, SYSUTCDATETIME(), DATEADD(DAY, 365, SYSUTCDATETIME()));
END
GO

/* =========================================================
   Views Firebase.
   Quando JSON_VALUE/OPENJSON não estiverem disponíveis,
   cria views fallback com payload_json para o Delphi/API tratar.
   ========================================================= */

DECLARE @MajorVersion INT = TRY_CONVERT(INT, SERVERPROPERTY('ProductMajorVersion'));
DECLARE @CompatLevel INT = (
    SELECT compatibility_level
    FROM sys.databases
    WHERE name = DB_NAME()
);
DECLARE @JsonOK BIT = CASE WHEN ISNULL(@MajorVersion,0) >= 13 AND ISNULL(@CompatLevel,0) >= 130 THEN 1 ELSE 0 END;

IF OBJECT_ID(N'goerp.vwGO_FirebaseServicosAExecutar', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseServicosAExecutar;
IF OBJECT_ID(N'goerp.vwGO_FirebaseDashboardOficina', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseDashboardOficina;
IF OBJECT_ID(N'goerp.vwGO_FirebaseInspecaoTecnica', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseInspecaoTecnica;
IF OBJECT_ID(N'goerp.vwGO_FirebaseOrdensServico', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseOrdensServico;
IF OBJECT_ID(N'goerp.vwGO_FirebaseVeiculos', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseVeiculos;
IF OBJECT_ID(N'goerp.vwGO_FirebaseClientes', N'V') IS NOT NULL DROP VIEW goerp.vwGO_FirebaseClientes;
IF OBJECT_ID(N'goerp.vwGO_LicencaStatus', N'V') IS NOT NULL DROP VIEW goerp.vwGO_LicencaStatus;

IF @JsonOK = 1
BEGIN
    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseClientes AS
SELECT
    d.tenant_id,
    d.doc_id AS id_cliente,
    COALESCE(JSON_VALUE(d.payload_json, ''$.nome''), JSON_VALUE(d.payload_json, ''$.nome_razao''), JSON_VALUE(d.payload_json, ''$.nomeRazao'')) AS nome,
    COALESCE(JSON_VALUE(d.payload_json, ''$.cpfCnpj''), JSON_VALUE(d.payload_json, ''$.cpf_cnpj'')) AS cpf_cnpj,
    JSON_VALUE(d.payload_json, ''$.telefone'') AS telefone,
    JSON_VALUE(d.payload_json, ''$.whatsapp'') AS whatsapp,
    JSON_VALUE(d.payload_json, ''$.email'') AS email,
    JSON_VALUE(d.payload_json, ''$.endereco'') AS endereco,
    CAST(NULL AS NVARCHAR(MAX)) AS payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao = N''clientes'' AND d.ativo = 1;
');

    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseVeiculos AS
SELECT
    d.tenant_id,
    d.doc_id AS id_veiculo,
    COALESCE(JSON_VALUE(d.payload_json, ''$.clienteId''), JSON_VALUE(d.payload_json, ''$.cliente_id'')) AS id_cliente,
    JSON_VALUE(d.payload_json, ''$.placa'') AS placa,
    COALESCE(JSON_VALUE(d.payload_json, ''$.tipoVeiculo''), JSON_VALUE(d.payload_json, ''$.tipo_veiculo'')) AS tipo_veiculo,
    JSON_VALUE(d.payload_json, ''$.marca'') AS marca,
    JSON_VALUE(d.payload_json, ''$.modelo'') AS modelo,
    COALESCE(TRY_CONVERT(INT, JSON_VALUE(d.payload_json, ''$.anoModelo'')), TRY_CONVERT(INT, JSON_VALUE(d.payload_json, ''$.ano''))) AS ano_modelo,
    JSON_VALUE(d.payload_json, ''$.cor'') AS cor,
    TRY_CONVERT(INT, JSON_VALUE(d.payload_json, ''$.km'')) AS km,
    CAST(NULL AS NVARCHAR(MAX)) AS payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao = N''veiculos'' AND d.ativo = 1;
');

    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseOrdensServico AS
SELECT
    d.tenant_id,
    d.doc_id AS id_os,
    JSON_VALUE(d.payload_json, ''$.numero'') AS numero_os,
    JSON_VALUE(d.payload_json, ''$.clienteId'') AS id_cliente,
    JSON_VALUE(d.payload_json, ''$.veiculoId'') AS id_veiculo,
    JSON_VALUE(d.payload_json, ''$.status'') AS status_os,
    JSON_VALUE(d.payload_json, ''$.tipoVeiculo'') AS tipo_veiculo,
    JSON_VALUE(d.payload_json, ''$.reclamacaoCliente'') AS reclamacao_cliente,
    JSON_VALUE(d.payload_json, ''$.diagnosticoTecnico'') AS diagnostico_tecnico,
    TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(d.payload_json, ''$.valorTotal'')) AS valor_total,
    TRY_CONVERT(DATETIME2(0), JSON_VALUE(d.payload_json, ''$.dataAbertura'')) AS data_abertura,
    TRY_CONVERT(DATETIME2(0), JSON_VALUE(d.payload_json, ''$.dataFechamento'')) AS data_fechamento,
    TRY_CONVERT(INT, JSON_VALUE(d.payload_json, ''$.inspecaoTecnica.totalPartes'')) AS total_partes_inspecionadas,
    TRY_CONVERT(INT, JSON_VALUE(d.payload_json, ''$.inspecaoTecnica.pendencias'')) AS pendencias_inspecao,
    CAST(NULL AS NVARCHAR(MAX)) AS payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao IN (N''ordens'', N''ordensServico'') AND d.ativo = 1;
');

    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseInspecaoTecnica AS
SELECT
    d.tenant_id,
    d.doc_id AS id_os,
    JSON_VALUE(d.payload_json, ''$.numero'') AS numero_os,
    p.parte,
    p.defeito,
    p.gravidade,
    p.status_item,
    p.observacao,
    p.peca,
    p.servico,
    TRY_CONVERT(DECIMAL(18,2), p.valor_servico) AS valor_servico,
    TRY_CONVERT(DATETIME2(0), JSON_VALUE(d.payload_json, ''$.inspecaoTecnica.atualizadoEm'')) AS inspecao_atualizada_em,
    CAST(NULL AS NVARCHAR(MAX)) AS payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
CROSS APPLY OPENJSON(JSON_QUERY(d.payload_json, ''$.inspecaoTecnica.partes''))
WITH (
    parte NVARCHAR(120) ''$.parte'',
    defeito NVARCHAR(120) ''$.defeito'',
    gravidade NVARCHAR(40) ''$.gravidade'',
    status_item NVARCHAR(40) ''$.status'',
    observacao NVARCHAR(2000) ''$.observacao'',
    peca NVARCHAR(180) ''$.peca'',
    servico NVARCHAR(180) ''$.servico'',
    valor_servico NVARCHAR(40) ''$.valor''
) p
WHERE d.colecao IN (N''ordens'', N''ordensServico'') AND d.ativo = 1;
');
END
ELSE
BEGIN
    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseClientes AS
SELECT
    d.tenant_id,
    d.doc_id AS id_cliente,
    CAST(NULL AS NVARCHAR(160)) AS nome,
    CAST(NULL AS NVARCHAR(20)) AS cpf_cnpj,
    CAST(NULL AS NVARCHAR(30)) AS telefone,
    CAST(NULL AS NVARCHAR(30)) AS whatsapp,
    CAST(NULL AS NVARCHAR(160)) AS email,
    CAST(NULL AS NVARCHAR(400)) AS endereco,
    d.payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao = N''clientes'' AND d.ativo = 1;
');

    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseVeiculos AS
SELECT
    d.tenant_id,
    d.doc_id AS id_veiculo,
    CAST(NULL AS NVARCHAR(160)) AS id_cliente,
    CAST(NULL AS NVARCHAR(10)) AS placa,
    CAST(NULL AS NVARCHAR(30)) AS tipo_veiculo,
    CAST(NULL AS NVARCHAR(80)) AS marca,
    CAST(NULL AS NVARCHAR(120)) AS modelo,
    CAST(NULL AS INT) AS ano_modelo,
    CAST(NULL AS NVARCHAR(60)) AS cor,
    CAST(NULL AS INT) AS km,
    d.payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao = N''veiculos'' AND d.ativo = 1;
');

    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseOrdensServico AS
SELECT
    d.tenant_id,
    d.doc_id AS id_os,
    CAST(NULL AS NVARCHAR(80)) AS numero_os,
    CAST(NULL AS NVARCHAR(160)) AS id_cliente,
    CAST(NULL AS NVARCHAR(160)) AS id_veiculo,
    CAST(NULL AS NVARCHAR(40)) AS status_os,
    CAST(NULL AS NVARCHAR(30)) AS tipo_veiculo,
    CAST(NULL AS NVARCHAR(MAX)) AS reclamacao_cliente,
    CAST(NULL AS NVARCHAR(MAX)) AS diagnostico_tecnico,
    CAST(NULL AS DECIMAL(18,2)) AS valor_total,
    CAST(NULL AS DATETIME2(0)) AS data_abertura,
    CAST(NULL AS DATETIME2(0)) AS data_fechamento,
    CAST(NULL AS INT) AS total_partes_inspecionadas,
    CAST(NULL AS INT) AS pendencias_inspecao,
    d.payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao IN (N''ordens'', N''ordensServico'') AND d.ativo = 1;
');

    EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseInspecaoTecnica AS
SELECT
    d.tenant_id,
    d.doc_id AS id_os,
    CAST(NULL AS NVARCHAR(80)) AS numero_os,
    CAST(NULL AS NVARCHAR(120)) AS parte,
    CAST(NULL AS NVARCHAR(120)) AS defeito,
    CAST(NULL AS NVARCHAR(40)) AS gravidade,
    CAST(NULL AS NVARCHAR(40)) AS status_item,
    CAST(NULL AS NVARCHAR(2000)) AS observacao,
    CAST(NULL AS NVARCHAR(180)) AS peca,
    CAST(NULL AS NVARCHAR(180)) AS servico,
    CAST(NULL AS DECIMAL(18,2)) AS valor_servico,
    CAST(NULL AS DATETIME2(0)) AS inspecao_atualizada_em,
    d.payload_json,
    d.atualizado_em_utc
FROM goerp.SyncDocumentos d
WHERE d.colecao IN (N''ordens'', N''ordensServico'') AND d.ativo = 1;
');
END

EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseServicosAExecutar AS
SELECT
    tenant_id, id_os, numero_os, parte, defeito, gravidade, status_item,
    servico AS descricao_servico, peca AS peca_relacionada, valor_servico, atualizado_em_utc
FROM goerp.vwGO_FirebaseInspecaoTecnica
WHERE ISNULL(servico, N'''') <> N''''
   OR payload_json IS NOT NULL;
');

EXEC(N'
CREATE VIEW goerp.vwGO_FirebaseDashboardOficina AS
SELECT
    tenant_id,
    COUNT(1) AS total_os,
    SUM(CASE WHEN status_os IN (N''ABERTA'', N''EM_DIAGNOSTICO'', N''EM EXECUCAO'', N''EM_EXECUCAO'') THEN 1 ELSE 0 END) AS os_abertas_execucao,
    SUM(CASE WHEN status_os IN (N''FINALIZADA'', N''FATURADA'') THEN 1 ELSE 0 END) AS os_finalizadas,
    SUM(ISNULL(valor_total, 0)) AS valor_total_os,
    SUM(ISNULL(pendencias_inspecao, 0)) AS pendencias_inspecao
FROM goerp.vwGO_FirebaseOrdensServico
GROUP BY tenant_id;
');

EXEC(N'
CREATE VIEW goerp.vwGO_LicencaStatus AS
SELECT
    TenantId AS tenant_id,
    ProdutoCodigo AS produto_codigo,
    CnpjCliente AS cnpj,
    RazaoSocial AS razao_social,
    Plano AS plano,
    Status AS status_licenca,
    CONVERT(DATE, ValidaDeUtc) AS validade_inicio,
    CONVERT(DATE, ValidaAteUtc) AS validade_fim,
    CASE
        WHEN Status <> N''ATIVA'' THEN CAST(0 AS BIT)
        WHEN ValidaAteUtc IS NOT NULL AND ValidaAteUtc < SYSUTCDATETIME() THEN CAST(0 AS BIT)
        ELSE CAST(1 AS BIT)
    END AS licenca_valida,
    MaxDispositivos AS limite_usuarios,
    MaxFiliais AS limite_filiais,
    CriadoEmUtc AS criado_em_utc,
    AtualizadoEmUtc AS atualizado_em_utc
FROM goerp.LicencasProduto;
');
GO

IF OBJECT_ID(N'goerp.SyncDocumentos', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_goerp_SyncDocumentos_Colecao' AND object_id = OBJECT_ID(N'goerp.SyncDocumentos'))
BEGIN
    CREATE INDEX IX_goerp_SyncDocumentos_Colecao
    ON goerp.SyncDocumentos (tenant_id, colecao, atualizado_em_utc DESC)
    INCLUDE (doc_id, ativo);
END
GO

SELECT
    'PATCH_06_EXECUTADO' AS status_patch,
    CASE
        WHEN EXISTS (SELECT 1 FROM sys.views WHERE object_id = OBJECT_ID(N'goerp.vwGO_FirebaseClientes')) THEN 'VIEWS_OK'
        ELSE 'VERIFICAR_VIEWS'
    END AS status_views,
    CASE
        WHEN EXISTS (SELECT 1 FROM sys.procedures WHERE object_id = OBJECT_ID(N'goerp.uspGO_ValidarLicencaLocal')) THEN 'PROCEDURES_OK'
        ELSE 'VERIFICAR_PROCEDURES'
    END AS status_procedures;
GO
