# Correção do erro: FirebaseError: Missing or insufficient permissions

Esse erro acontece quando o Cloud Firestore bloqueia a leitura ou gravação pelas regras de segurança.

Na versão atual do MVP, o login ainda é interno da aplicação, e não usa Firebase Authentication. Por isso, se você publicou regras do tipo:

```js
allow read, write: if request.auth != null;
```

o Firestore vai negar tudo, porque `request.auth` fica `null`.

## Correção para teste controlado

No Firebase Console:

1. Abra seu projeto.
2. Vá em **Firestore Database**.
3. Clique na aba **Rules/Regras**.
4. Cole o conteúdo abaixo.
5. Clique em **Publicar**.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // APENAS PARA MVP/TESTE CONTROLADO.
    // Não use estas regras em produção.
    match /oficinas/{oficinaId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Depois recarregue a aplicação.

## Correção via Firebase CLI

O pacote já inclui `firestore.rules` e `firebase.json`.

Execute na pasta do projeto:

```bash
firebase login
firebase use SEU_PROJECT_ID
firebase deploy --only firestore:rules
```

## Produção

Para produção, não use regra aberta. A próxima etapa correta é:

- ativar Firebase Authentication;
- trocar o login interno por login do Firebase;
- usar regras por `request.auth.uid`;
- criar perfis/claims para ADMIN, MECANICO e FINANCEIRO;
- mover fotos e assinaturas para Firebase Storage.
