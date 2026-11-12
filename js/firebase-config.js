// Configuração do Firebase
//
// Enquanto estiver `null`, o site roda em MODO LOCAL: tudo fica salvo só neste navegador
// (ótimo para estudar e testar). Para ter login com Google, sincronizar entre computadores
// e usar a conta conjunta, siga o passo 2 do README e cole aqui o objeto do seu app web.
//
// Esses valores NÃO são senhas: o Firebase foi feito para que eles fiquem no código do site.
// Quem protege os dados são as regras do arquivo firestore.rules.
/*
PARA TESTES LOCAIS

export const firebaseConfig = null;

*/

export const firebaseConfig = {
  apiKey: "AIzaSyArMQG7pbuQCkjHnx0BfjJBpU0_11vs3tM",
  authDomain: "coinspend-4cbd6.firebaseapp.com",
  projectId: "coinspend-4cbd6",
  storageBucket: "coinspend-4cbd6.firebasestorage.app",
  messagingSenderId: "585198307900",
  appId: "1:585198307900:web:d9f583c8ce2b8552621139",
  measurementId: "G-M99GBF6CDX"
};


/* Exemplo (troque pelos valores do SEU projeto):
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "Coinspend.firebaseapp.com",
  projectId: "coinspend-4cbd6",
  storageBucket: "meu-financas.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456",
};
*/
