// "Barramento" do app: pede para redesenhar a tela e mostra avisos (toasts).
// Fica separado para que qualquer módulo possa chamar changed()/toast() sem criar dependências circulares.
export let renderer = null;
export let queued = false;

/** Registra a função que desenha a tela (chamado uma vez pelo main.js). */
export function setRenderer(fn){ renderer = fn; }

/** Agenda um redesenho no próximo frame. Várias chamadas seguidas viram um redesenho só. */
export function changed(){
  if (queued || !renderer) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; renderer(); });
}

/** Funções que rodam depois que o HTML da tela foi inserido (ex.: desenhar gráficos, que precisam da largura real). */
export const afterRender = [];

/** Mostra um aviso rápido no rodapé da tela. */
export function toast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
