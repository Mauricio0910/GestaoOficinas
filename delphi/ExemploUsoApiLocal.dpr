program ExemploUsoApiLocal;

{$APPTYPE CONSOLE}

uses
  System.SysUtils,
  GestaoOficinasLocalApiClient in 'GestaoOficinasLocalApiClient.pas';

var
  Api: TGestaoOficinasLocalApiClient;
begin
  try
    Api := TGestaoOficinasLocalApiClient.Create(
      'http://localhost:3031',
      'troque-esta-chave-local'
    );
    try
      Writeln('Health:');
      Writeln(Api.Health);

      Writeln;
      Writeln('Validando licença:');
      Writeln(Api.ValidarLicenca(
        'oficina_demo',
        'GO-PRO-DEMO-2026',
        '',
        'DELPHI-ERP-001',
        '1.0.0'
      ));

      Writeln;
      Writeln('Sincronizando Firestore -> SQL:');
      Writeln(Api.ImportarFirestoreAgora('oficina_demo'));

      Writeln;
      Writeln('Ordens de Serviço:');
      Writeln(Api.ListarOrdensServico);
    finally
      Api.Free;
    end;

    Readln;
  except
    on E: Exception do
    begin
      Writeln('Erro: ' + E.Message);
      Readln;
    end;
  end;
end.
