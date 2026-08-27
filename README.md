# OficinaPro OS - MVP Web Responsivo + Firebase

Aplicação inicial de gestão de ordens de serviço para oficinas mecânicas.

## Banco de dados

Esta versão pode trabalhar de duas formas:

1. **Firebase Cloud Firestore**, quando `firebase-config.js` estiver configurado.
2. **LocalStorage**, como fallback para teste rápido sem Firebase.

Na primeira execução com Firebase configurado, se a base estiver vazia, o sistema cria dados demo automaticamente.

## Como abrir para teste local

Como a versão Firebase usa módulos JavaScript, rode por HTTP:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

Login inicial:

```text
admin@oficina.com
admin123
```

## Como ativar Firebase

1. Crie um projeto no Firebase Console.
2. Adicione um app Web.
3. Ative o Cloud Firestore.
4. Copie o objeto `firebaseConfig`.
5. Cole os dados no arquivo `firebase-config.js`.
6. Rode novamente a aplicação por HTTP.

Guia detalhado:

```text
docs/firebase-setup.md
```

## Estrutura Firestore

```text
oficinas/{tenantId}/meta/config
oficinas/{tenantId}/users/{id}
oficinas/{tenantId}/clientes/{id}
oficinas/{tenantId}/veiculos/{id}
oficinas/{tenantId}/servicos/{id}
oficinas/{tenantId}/pecas/{id}
oficinas/{tenantId}/ordens/{id}
oficinas/{tenantId}/logs/{id}
```

Modelo detalhado:

```text
docs/firestore-modelo.md
```

## Funcionalidades incluídas no MVP

- Login interno do MVP.
- Cadastro de usuários.
- Cadastro de clientes.
- Cadastro de veículos.
- Cadastro de serviços.
- Cadastro de peças/estoque.
- Ordens de serviço.
- Serviços e peças na OS.
- Baixa simples de estoque ao adicionar peça.
- Checklist visual com marcações no desenho do veículo.
- Assinatura digital via canvas.
- Termo de garantia.
- Impressão/exportação como PDF pelo navegador.
- Dashboard.
- Relatório de comissões.
- Logs de auditoria.
- Backup/importação JSON.
- PWA básica.
- Persistência no Firebase Cloud Firestore quando configurado.

## Segurança

A versão atual ainda usa login interno salvo na coleção `users`.  
Para produção, a próxima etapa recomendada é migrar autenticação para:

- Firebase Authentication.
- Regras Firestore restritivas.
- Perfis por claims ou documentos de usuário.
- Firebase Storage para fotos e assinaturas.
- Cloud Functions para rotinas sensíveis.

Arquivos incluídos:

```text
firebase/firestore.dev.rules
firebase/firestore.prod-auth.rules
```

Use `firestore.dev.rules` apenas para testes controlados.

## Integração veicular

A integração SENATRAN/SERPRO segue desativada nesta versão.  
A modelagem já deixa espaço para adicionar futuramente a coleção `consultas_veiculares`.


## Correção rápida: Firestore `Missing or insufficient permissions`

Se aparecer `FirebaseError: Missing or insufficient permissions`, publique as regras de teste:

```bash
firebase deploy --only firestore:rules
```

Ou cole manualmente no Firebase Console o conteúdo de `firestore.rules`.

Veja detalhes em `docs/ERRO_FIREBASE_PERMISSOES.md`.


## Incrementos desta versão

- Dashboard ampliado com indicadores operacionais e defeitos pendentes.
- Identificação rápida de veículo por marca/modelo/ano usando base local.
- Formulário de veículo com seleção por catálogo e campos manuais de ajuste.
- Checklist visual aprimorado para o mecânico marcar área, tipo de defeito, gravidade, status e observação.
- Coleção `catalogoVeiculos` preparada para Firebase/Firestore.
- Documento técnico em `docs/incremento-dashboard-veiculos-checklist.md`.


## Atualização: inspeção técnica visual por tipo de veículo

Esta versão inclui:

- Dashboard com indicadores operacionais.
- Cadastro de veículos com tipo: moto, automóvel, SUV, caminhonete, caminhão toco, caminhão baú e ônibus.
- Catálogo local de veículos ampliado.
- Aba de OS com inspeção técnica visual por categoria de veículo.
- Imagem/diagrama do veículo conforme o tipo selecionado.
- Checklist por partes do veículo.
- Para cada parte marcada:
  - tipo de defeito;
  - gravidade;
  - status;
  - problema relatado;
  - peças sugeridas;
  - serviço sugerido;
  - cadastro de novo serviço a executar.
- Botão para gerar serviços e peças diretamente na OS a partir da inspeção.
- PWA com botão de instalação quando o navegador permitir.
- Logo e layout visual atualizados.

### Importante ao atualizar em um projeto já conectado ao Firebase

Se o seu `firebase-config.js` já está preenchido com os dados reais do Firebase, não substitua esse arquivo por uma versão com `COLE_AQUI`.

Ao atualizar pelo Codespaces, prefira manter o arquivo existente:

```bash
unzip -o gestao-oficinas-pro-inspecao-app.zip -x "oficina-os-pwa/firebase-config.js"
```

Ou, se substituir sem querer, cole novamente os dados do Firebase.


## Atualização: Inspeção técnica com blueprint

Esta versão corrige o salvamento da inspeção técnica, grava os dados também em `inspecaoTecnica` dentro da OS e substitui as maquetes por diagramas técnicos em SVG com fundo branco.

## Atualização: Integração Delphi/SQL Server 2019 e licenciamento

Esta versão adiciona uma camada de integração para o produto adicional GestãoOficinas Pro.

Novos diretórios:

```text
sqlserver/
api/gestao-oficinas-integration-api/
delphi/
docs/integracao-delphi-sql2019.md
docs/licenciamento-produto-adicional.md
docs/deploy-api-integracao.md
```

### Scripts SQL Server

Execute no SQL Server 2019:

```text
sqlserver/00_schema_integracao_licenciamento.sql
sqlserver/01_views_integracao_delphi.sql
sqlserver/02_procedures_integracao_licenciamento.sql
sqlserver/03_indices_recomendados.sql
sqlserver/04_seed_licenca_demo.sql
```

### Views Delphi

As views `goerp.vwGO_*` foram criadas para serem a camada estável de leitura pelo ERP Delphi.

### Licenciamento

No app, acesse:

```text
Configurações > Licenciamento do produto
```

Preencha a URL da API e chave da licença para validar o uso comercial.
