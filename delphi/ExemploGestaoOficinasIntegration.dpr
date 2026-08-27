program ExemploGestaoOficinasIntegration;

{$APPTYPE CONSOLE}

uses
  System.SysUtils,
  GestaoOficinasIntegrationClient in 'GestaoOficinasIntegrationClient.pas';

var
  Client: TGestaoOficinasClient;
  Json: string;

begin
  try
    Client := TGestaoOficinasClient.Create(
      'https://api.suaempresa.com.br',
      'SUA_API_KEY'
    );
    try
      Writeln('Health:');
      Writeln(Client.Health);

      Writeln;
      Writeln('Validando licença:');
      Json := Client.ValidarLicenca(
        'GO-PRO-DEMO-0001-0001',
        'oficina_demo',
        'delphi-retaguarda-001',
        '00000000000000',
        'DELPHI'
      );
      Writeln(Json);

      Writeln;
      Writeln('Ordens de serviço:');
      Json := Client.ListarOrdensServico('oficina_demo');
      Writeln(Json);
    finally
      Client.Free;
    end;
  except
    on E: Exception do
    begin
      Writeln('Erro: ' + E.Message);
      Halt(1);
    end;
  end;
end.
