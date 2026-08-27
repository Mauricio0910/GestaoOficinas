unit GestaoOficinasIntegrationClient;

{
  Cliente Delphi para integração com a API GestãoOficinas Pro.

  Compatível com Delphi moderno usando System.Net.HttpClient.
  Para versões antigas, adapte para Indy/TIdHTTP.

  Uso básico:
    Client := TGestaoOficinasClient.Create('https://api.suaempresa.com.br', 'SUA_API_KEY');
    try
      JsonOS := Client.ListarOrdensServico('oficina_demo', '', '');
      Memo1.Lines.Text := JsonOS;
    finally
      Client.Free;
    end;
}

interface

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  System.Net.URLClient,
  System.Net.HttpClient,
  System.Net.HttpClientComponent;

type
  EGestaoOficinasIntegrationError = class(Exception);

  TGestaoOficinasClient = class
  private
    FBaseUrl: string;
    FApiKey: string;
    FHttp: TNetHTTPClient;

    function NormalizeUrl(const AUrl: string): string;
    function RequestJson(const AMethod, APath: string; const ABody: string = ''): string;
  public
    constructor Create(const ABaseUrl, AApiKey: string);
    destructor Destroy; override;

    function Health: string;

    function ValidarLicenca(
      const AChave: string;
      const ATenant: string;
      const ADeviceId: string;
      const ACnpj: string = '';
      const AOrigem: string = 'DELPHI'
    ): string;

    function ListarOrdensServico(
      const ATenant: string;
      const AStatus: string = '';
      const ADesdeISO: string = ''
    ): string;

    function ObterOrdemServico(const AOrdemServicoId: string): string;

    function UpsertCliente(
      const AClienteId: string;
      const ATenant: string;
      const ATipoPessoa: string;
      const ANomeRazao: string;
      const ACpfCnpj: string;
      const ATelefone: string;
      const AEmail: string
    ): string;
  end;

implementation

constructor TGestaoOficinasClient.Create(const ABaseUrl, AApiKey: string);
begin
  inherited Create;
  FBaseUrl := NormalizeUrl(ABaseUrl);
  FApiKey := AApiKey;

  FHttp := TNetHTTPClient.Create(nil);
  FHttp.ConnectionTimeout := 15000;
  FHttp.ResponseTimeout := 30000;
  FHttp.UserAgent := 'GestaoOficinas-Delphi-Client/1.0';
end;

destructor TGestaoOficinasClient.Destroy;
begin
  FHttp.Free;
  inherited;
end;

function TGestaoOficinasClient.NormalizeUrl(const AUrl: string): string;
begin
  Result := Trim(AUrl);
  while Result.EndsWith('/') do
    Delete(Result, Length(Result), 1);
end;

function TGestaoOficinasClient.RequestJson(const AMethod, APath: string; const ABody: string): string;
var
  Url: string;
  Response: IHTTPResponse;
  BodyStream: TStringStream;
begin
  Url := FBaseUrl + APath;
  FHttp.CustomHeaders['Accept'] := 'application/json';

  if FApiKey <> '' then
    FHttp.CustomHeaders['x-api-key'] := FApiKey;

  BodyStream := nil;
  try
    if SameText(AMethod, 'GET') then
      Response := FHttp.Get(Url)
    else
    begin
      FHttp.ContentType := 'application/json; charset=utf-8';
      BodyStream := TStringStream.Create(ABody, TEncoding.UTF8);
      if SameText(AMethod, 'POST') then
        Response := FHttp.Post(Url, BodyStream)
      else
        raise EGestaoOficinasIntegrationError.CreateFmt('Método HTTP não suportado: %s', [AMethod]);
    end;

    Result := Response.ContentAsString(TEncoding.UTF8);

    if (Response.StatusCode < 200) or (Response.StatusCode >= 300) then
      raise EGestaoOficinasIntegrationError.CreateFmt(
        'Erro na API GestãoOficinas. HTTP %d: %s',
        [Response.StatusCode, Result]
      );
  finally
    BodyStream.Free;
  end;
end;

function TGestaoOficinasClient.Health: string;
begin
  Result := RequestJson('GET', '/health');
end;

function TGestaoOficinasClient.ValidarLicenca(
  const AChave: string;
  const ATenant: string;
  const ADeviceId: string;
  const ACnpj: string;
  const AOrigem: string
): string;
var
  Obj: TJSONObject;
begin
  Obj := TJSONObject.Create;
  try
    Obj.AddPair('produto', 'GESTAO_OFICINAS_PRO');
    Obj.AddPair('chave', AChave);
    Obj.AddPair('tenant', ATenant);
    Obj.AddPair('deviceId', ADeviceId);
    Obj.AddPair('cnpj', ACnpj);
    Obj.AddPair('origem', AOrigem);

    Result := RequestJson('POST', '/api/v1/licenciamento/validar', Obj.ToJSON);
  finally
    Obj.Free;
  end;
end;

function TGestaoOficinasClient.ListarOrdensServico(
  const ATenant: string;
  const AStatus: string;
  const ADesdeISO: string
): string;
var
  Path: string;
begin
  Path := '/api/v1/ordens-servico?tenant=' + TNetEncoding.URL.Encode(ATenant);

  if AStatus <> '' then
    Path := Path + '&status=' + TNetEncoding.URL.Encode(AStatus);

  if ADesdeISO <> '' then
    Path := Path + '&desde=' + TNetEncoding.URL.Encode(ADesdeISO);

  Result := RequestJson('GET', Path);
end;

function TGestaoOficinasClient.ObterOrdemServico(const AOrdemServicoId: string): string;
begin
  Result := RequestJson('GET', '/api/v1/ordens-servico/' + TNetEncoding.URL.Encode(AOrdemServicoId));
end;

function TGestaoOficinasClient.UpsertCliente(
  const AClienteId: string;
  const ATenant: string;
  const ATipoPessoa: string;
  const ANomeRazao: string;
  const ACpfCnpj: string;
  const ATelefone: string;
  const AEmail: string
): string;
var
  Obj: TJSONObject;
begin
  Obj := TJSONObject.Create;
  try
    Obj.AddPair('clienteId', AClienteId);
    Obj.AddPair('tenantId', ATenant);
    Obj.AddPair('tipoPessoa', ATipoPessoa);
    Obj.AddPair('nomeRazao', ANomeRazao);
    Obj.AddPair('cpfCnpj', ACpfCnpj);
    Obj.AddPair('telefone', ATelefone);
    Obj.AddPair('email', AEmail);

    Result := RequestJson('POST', '/api/v1/clientes/upsert', Obj.ToJSON);
  finally
    Obj.Free;
  end;
end;

end.
