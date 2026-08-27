/*
  GestãoOficinas Pro - SQL Server 2019
  Script 04 - Exemplo de cadastro de licença

  Substitua:
  - @ChaveLicenca por chave comercial gerada pela sua empresa.
  - @TenantId pelo tenant do cliente/oficina.
*/

DECLARE @ProdutoCodigo NVARCHAR(80) = 'GESTAO_OFICINAS_PRO';
DECLARE @TenantId NVARCHAR(80) = 'oficina_demo';
DECLARE @ChaveLicenca NVARCHAR(120) = 'GO-PRO-DEMO-0001-0001';
DECLARE @LicencaId UNIQUEIDENTIFIER = NEWID();

IF NOT EXISTS (
    SELECT 1 FROM goerp.LicencasProduto
    WHERE ProdutoCodigo = @ProdutoCodigo
      AND TenantId = @TenantId
)
BEGIN
    INSERT INTO goerp.LicencasProduto (
        LicencaId, ProdutoCodigo, TenantId, CnpjCliente, RazaoSocial,
        ChaveLicencaHash, Plano, Status, MaxDispositivos, MaxFiliais,
        ValidaDeUtc, ValidaAteUtc
    )
    VALUES (
        @LicencaId, @ProdutoCodigo, @TenantId, '00000000000000', 'Cliente Demonstração',
        HASHBYTES('SHA2_256', @ChaveLicenca), 'DEMO', 'ATIVA', 5, 1,
        SYSUTCDATETIME(), DATEADD(DAY, 30, SYSUTCDATETIME())
    );
END;

SELECT * FROM goerp.vwGO_LicencaStatus WHERE ProdutoCodigo = @ProdutoCodigo AND TenantId = @TenantId;
