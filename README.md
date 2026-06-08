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
