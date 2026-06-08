// Configuração do Firebase para o OficinaPro OS.
//
// 1) Crie um projeto no Firebase Console.
// 2) Crie um app Web e copie o objeto firebaseConfig.
// 3) Ative o Cloud Firestore.
// 4) Cole os dados reais abaixo.
// 5) Rode o projeto em servidor local ou Firebase Hosting. Ex.: python -m http.server 8000
//
// Observação: apiKey do Firebase Web não é uma senha do banco.
// A segurança real deve ser feita pelas regras do Firestore e, em produção, pelo Firebase Auth.

export const USE_FIREBASE = true;

// Use um tenant por oficina/empresa.
// Ex.: oficina_matriz, oficina_001, cnpj_12345678000199
export const FIREBASE_TENANT_ID = 'oficina_demo';

export const firebaseConfig = {
  apiKey: 'COLE_AQUI_API_KEY',
  authDomain: 'COLE_AQUI_PROJECT_ID.firebaseapp.com',
  projectId: 'COLE_AQUI_PROJECT_ID',
  storageBucket: 'COLE_AQUI_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'COLE_AQUI_MESSAGING_SENDER_ID',
  appId: 'COLE_AQUI_APP_ID'
};
