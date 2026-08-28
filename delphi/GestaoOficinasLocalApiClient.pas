unit GestaoOficinasLocalApiClient;

interface

uses
  System.SysUtils,
  System.Classes,
  System.JSON,
  System.Net.HttpClient,
  System.Net.URLClient;

type
  TGestaoOficinasLocalApiClient = class
  private
    FBaseUrl: string;
    FApiKey: string;
    FHttp: TNetHTTPClient;
    function BuildUrl(const APath: string): string;
    function RequestJson(const AMethod, APath: string; ABody: TJSONObject = nil): string;
  public
    constructor Create(const ABaseUrl, AApiKey: string);
    destructor Destroy; override;

    function Health: string;
    function ValidarLicenca(const ATenantId, AChaveLicenca, ACnpj, ADispositivoId, AVersaoApp: string): string;
    function ImportarFirestoreAgora(const ATenantId: string): string;
    function StatusSync: string;
    function ListarOrdensServico: string;
    function ListarInspecoes: string;
  end;

implementation

constructor TGestaoOficinasLocalApiClient.Create(const ABaseUrl, AApiKey: string);
begin
  inherited Create;
  FBaseUrl := ABaseUrl.TrimRight(['/']);
  FApiKey := AApiKey;
  FHttp := TNetHTTPClient.Create(nil);
  FHttp.ConnectionTimeout := 15000;
  FHttp.ResponseTimeout := 60000;
  FHttp.CustomHeaders['x-api-key'] := FApiKey;
end;

destructor TGestaoOficinasLocalApiClient.Destroy;
begin
  FHttp.Free;
  inherited;
end;

function TGestaoOficinasLocalApiClient.BuildUrl(const APath: string): string;
begin
  if APath.StartsWith('/') then
    Result := FBaseUrl + APath
  else
    Result := FBaseUrl + '/' + APath;
end;

function TGestaoOficinasLocalApiClient.RequestJson(const AMethod, APath: string; ABody: TJSONObject): string;
var
  LResponse: IHTTPResponse;
  LBody: TStringStream;
begin
  LBody := nil;
  try
    if Assigned(ABody) then
      LBody := TStringStream.Create(ABody.ToJSON, TEncoding.UTF8);

    if SameText(AMethod, 'GET') then
      LResponse := FHttp.Get(BuildUrl(APath))
    else if SameText(AMethod, 'POST') then
      LResponse := FHttp.Post(BuildUrl(APath), LBody, nil,
        [TNetHeader.Create('Content-Type', 'application/json')])
    else
      raise Exception.Create('Método HTTP não suportado: ' + AMethod);

    Result := LResponse.ContentAsString(TEncoding.UTF8);

    if LResponse.StatusCode >= 400 then
      raise Exception.CreateFmt('Erro HTTP %d: %s', [LResponse.StatusCode, Result]);
  finally
    LBody.Free;
  end;
end;

function TGestaoOficinasLocalApiClient.Health: string;
begin
  Result := RequestJson('GET', '/health', nil);
end;

function TGestaoOficinasLocalApiClient.ValidarLicenca(
  const ATenantId, AChaveLicenca, ACnpj, ADispositivoId, AVersaoApp: string): string;
var
  LJson: TJSONObject;
begin
  LJson := TJSONObject.Create;
  try
    LJson.AddPair('tenantId', ATenantId);
    LJson.AddPair('chaveLicenca', AChaveLicenca);
    LJson.AddPair('cnpj', ACnpj);
    LJson.AddPair('deviceId', ADispositivoId);
    LJson.AddPair('versaoApp', AVersaoApp);
    Result := RequestJson('POST', '/api/v1/licenciamento/validar', LJson);
  finally
    LJson.Free;
  end;
end;

function TGestaoOficinasLocalApiClient.ImportarFirestoreAgora(const ATenantId: string): string;
var
  LJson: TJSONObject;
begin
  LJson := TJSONObject.Create;
  try
    LJson.AddPair('tenantId', ATenantId);
    Result := RequestJson('POST', '/api/v1/sync/firestore/importar', LJson);
  finally
    LJson.Free;
  end;
end;

function TGestaoOficinasLocalApiClient.StatusSync: string;
begin
  Result := RequestJson('GET', '/api/v1/sync/status', nil);
end;

function TGestaoOficinasLocalApiClient.ListarOrdensServico: string;
begin
  Result := RequestJson('GET', '/api/v1/sql/ordens-servico', nil);
end;

function TGestaoOficinasLocalApiClient.ListarInspecoes: string;
begin
  Result := RequestJson('GET', '/api/v1/sql/inspecoes', nil);
end;

end.
