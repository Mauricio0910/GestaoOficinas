# Configuração Firebase - OficinaPro OS

Esta versão do MVP pode usar o **Firebase Cloud Firestore** como banco principal.

## O que já está pronto

- `firebase-config.js`: local para colar a configuração do seu app Web Firebase.
- `firebase-db.js`: camada de persistência Firestore.
- `firebase/firestore.dev.rules`: regras abertas para teste controlado.
- `firebase/firestore.prod-auth.rules`: modelo para próxima fase com Firebase Authentication.
- `firebase.json`: configuração inicial para Firebase Hosting e Firestore Rules.

## Passo a passo

### 1. Criar o projeto

1. Acesse o Firebase Console.
2. Crie um novo projeto.
3. Adicione um app Web.
4. Copie o objeto `firebaseConfig`.

### 2. Editar `firebase-config.js`

Substitua os valores `COLE_AQUI_*` pelos dados reais do seu projeto:

```js
export const firebaseConfig = {
  apiKey: '...',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  storageBucket: 'seu-projeto.firebasestorage.app',
  messagingSenderId: '...',
  appId: '...'
};
```

Defina também o tenant da oficina:

```js
export const FIREBASE_TENANT_ID = 'oficina_matriz';
```

### 3. Ativar Firestore

No Firebase Console:

1. Vá em **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha o modo nativo.
4. Para teste controlado, use regras de desenvolvimento.
5. Para produção, use autenticação e regras restritivas.

### 4. Rodar localmente

Como o app usa módulos JavaScript, rode por HTTP:

```bash
python -m http.server 8000
```

Acesse:

```text
http://localhost:8000
```

### 5. Primeiro acesso

Na primeira carga com Firebase configurado, se a base estiver vazia, o sistema cria dados demo automaticamente:

- Usuário: `admin@oficina.com`
- Senha: `admin123`

Na versão atual, o login ainda é interno do MVP, gravado na coleção `users`.
Na próxima fase, o ideal é migrar para Firebase Authentication.

## Estrutura criada no Firestore

```text
oficinas/{FIREBASE_TENANT_ID}/meta/config
oficinas/{FIREBASE_TENANT_ID}/users/{id}
oficinas/{FIREBASE_TENANT_ID}/clientes/{id}
oficinas/{FIREBASE_TENANT_ID}/veiculos/{id}
oficinas/{FIREBASE_TENANT_ID}/servicos/{id}
oficinas/{FIREBASE_TENANT_ID}/pecas/{id}
oficinas/{FIREBASE_TENANT_ID}/ordens/{id}
oficinas/{FIREBASE_TENANT_ID}/logs/{id}
```

## Deploy no Firebase Hosting

Instale a CLI:

```bash
npm install -g firebase-tools
```

Faça login:

```bash
firebase login
```

Inicialize, se desejar recriar:

```bash
firebase init hosting firestore
```

Ou use os arquivos já incluídos e rode:

```bash
firebase deploy
```

## Atenção de segurança

As regras `firestore.dev.rules` são abertas e servem apenas para demonstração ou teste controlado.

Para produção:

- Migrar login para Firebase Authentication.
- Usar `firestore.prod-auth.rules` como ponto de partida.
- Implementar perfis/claims para ADMIN, MECANICO, FINANCEIRO etc.
- Separar fotos e assinaturas no Firebase Storage.
- Evitar senhas salvas em Firestore.
- Auditar alterações críticas.
