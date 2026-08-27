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
    apiKey: "AIzaSyAMmgp1uivGcXP8J4zq6ndUtuu4N28Y6uY",
    authDomain: "gestaooficinas-9f93b.firebaseapp.com",
    databaseURL: "https://gestaooficinas-9f93b-default-rtdb.firebaseio.com",
    projectId: "gestaooficinas-9f93b",
    storageBucket: "gestaooficinas-9f93b.firebasestorage.app",
    messagingSenderId: "197310424745",
    appId: "1:197310424745:web:3597d3513aa588a0c5abb8",
    measurementId: "G-BP9E6TZT21"
  };
