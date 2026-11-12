// Ponto de entrada do app: aplica o tema, liga o banco de dados (Firebase ou local) e desenha a tela.
// O index.html carrega só este arquivo; ele importa todo o resto.
import { route } from './actions.js';
import { changed, setRenderer } from './bus.js';
import { initFirebase } from './data/firebase-db.js';
import { LocalDB } from './data/local-db.js';
import { setAuth, setDB, startSpace } from './data/store.js';
import { firebaseConfig } from './firebase-config.js';
import { render } from './render.js';
import { state } from './state.js';

import './actions.js'; // registra os cliques, teclas e formulários

setRenderer(render);

export async function boot(){
  if (!state.theme) state.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;
  route();
  setTimeout(() => { state.slow = true; changed(); }, 10000);

  if (firebaseConfig && firebaseConfig.apiKey){
    // ---- Modo Firebase: login com Google e dados na nuvem ----
    try {
      const fb = await initFirebase(firebaseConfig);
      setDB(fb.db); setAuth(fb.auth);
      fb.auth.onChange(user => {
        if (user){
          if (state.uid && state.uid !== user.uid) return location.reload(); // trocou de conta
          state.uid = user.uid;
          state.userName = user.displayName || (user.email || '').split('@')[0] || 'Você';
          state.userEmail = user.email || '';
          state.names[user.uid] = state.userName;
          state.mode = 'cloud';
          startSpace('personal'); // a conta conjunta liga sozinha quando os ajustes pessoais chegam
        } else {
          state.uid = null; state.mode = 'auth';
        }
        changed();
      });
    } catch (e) {
      console.error(e);
      state.mode = 'error';
      state.error = 'Não foi possível carregar o Firebase. Verifique sua internet e os dados em js/firebase-config.js.';
      changed();
    }
  } else {
    // ---- Modo local: tudo fica no navegador ----
    setDB(LocalDB());
    state.uid = 'local'; state.userName = 'Você'; state.names.local = 'Você';
    state.mode = 'local';
    startSpace('personal');
    changed();
  }

  // Permite "instalar" o site como aplicativo (PWA) e abrir sem internet
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker não registrado', e));
  }
}

boot();
