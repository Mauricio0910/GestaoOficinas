# Próxima etapa implementada

Esta atualização adiciona:

- `api/gestao-oficinas-local-agent`: API local e agente de sincronização;
- `sqlserver/05_sync_local_firebase_sql2019.sql`: script incremental SQL Server 2019;
- `delphi/GestaoOficinasLocalApiClient.pas`: client Delphi exemplo;
- documentação de implantação.

## Aplicar no Codespaces

```bash
unzip -o gestao-oficinas-pro-api-local-sync-update.zip
cp -r oficina-os-pwa/* .
cp -r oficina-os-pwa/.[!.]* . 2>/dev/null || true
rm -rf oficina-os-pwa
rm gestao-oficinas-pro-api-local-sync-update.zip

git add .
git commit -m "Adiciona API local sync Firebase SQL Server e client Delphi"
git push
```
