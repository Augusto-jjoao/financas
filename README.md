# 💰 Finanças

Controle de finanças pessoais e da conta conjunta. Funciona no navegador, pode ser instalado como aplicativo e cada pessoa entra com a própria conta Google.

**O que dá para fazer**
- **Visão geral:** mostra quanto você realmente tem para gastar no mês. Parte da renda, desconta assinaturas, despesas fixas e a fatura do cartão, e depois os gastos do dia a dia.
- **Renda mensal:** vira uma entrada automática no 5º dia útil (regra da CLT) ou num dia fixo que você escolher.
- **Lançamentos:** entradas e saídas com valor, data, descrição, categoria e tags. A tecla **N** abre um lançamento novo.
- **Cartão de crédito:** limite, fechamento, vencimento, compras parceladas, fatura de cada mês e limite disponível.
- **Assinaturas e despesas fixas:** custo mensal e anual, contas pendentes e atrasadas.
- **Orçamento:** limite por mês e por categoria, com a sugestão 50-30-20.
- **Metas:** quanto você já guardou e para onde vai cada parte (viagem, computador, presente…).
- **Relatórios:** gráficos mês a mês, por categoria e por tag.
- **Onde aplicar:** simulador de investimentos seguros (Tesouro, CDB, LCI/LCA, poupança). É conteúdo educativo, não recomendação.
- **Conta conjunta:** você e outra pessoa veem e lançam os mesmos dados, em tempo real.
- **Outros:** modo claro e escuro, ocultar valores, backup e importação.

---

## 1. Rodar no seu computador (modo local)

Não precisa instalar Node, npm nem nada parecido: é HTML, CSS e JavaScript puro.

1. Abra a pasta `financas` no **VS Code** (*Arquivo → Abrir Pasta…*).
2. Instale a extensão **Live Server** (o VS Code sugere sozinho, pelo `.vscode/extensions.json`).
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
4. O site abre em `http://127.0.0.1:5500`. Ao salvar um arquivo, a página recarrega sozinha.

> ⚠️ Abrir o `index.html` com dois cliques **não funciona**. O navegador bloqueia módulos JavaScript em arquivos locais (`file://`), por isso é preciso o Live Server.

Enquanto o `js/firebase-config.js` estiver com `null`, o app roda em **modo local**: os dados ficam salvos só naquele navegador. É ótimo para estudar e testar, mas não sincroniza entre computadores e não tem conta conjunta.

---

## 2. Configurar o Firebase (login com Google + dados na nuvem)

O plano gratuito (Spark) do Firebase é suficiente para uso pessoal. É grátis e não pede cartão.

1. Acesse <https://console.firebase.google.com> e clique em **Criar projeto** (ex.: `financas-joao`). Pode desativar o Google Analytics.
2. **Registrar o app web:** na página do projeto, clique no ícone **`</>`** (Web). Dê um nome (ex.: `financas-web`). **Não** marque o Firebase Hosting. Clique em *Registrar app*.
3. Aparece um objeto `const firebaseConfig = { ... }`. Copie **só o objeto** e cole em `js/firebase-config.js`, no lugar de `null`. Exemplo:
   ```js
   export const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "financas-joao.firebaseapp.com",
     projectId: "financas-joao",
     storageBucket: "financas-joao.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123",
   };
   ```
   Esses valores **não são senhas** e podem ir para o GitHub. Quem protege os dados são as regras do passo 6.
4. **Login com Google:** no menu, vá em **Criação → Authentication → Vamos começar**. Na aba *Método de login*, ative **Google**, escolha seu e-mail de suporte e salve.
5. **Banco de dados:** vá em **Criação → Firestore Database → Criar banco de dados**. Escolha o local `southamerica-east1 (São Paulo)` e o **modo de produção**.
6. **Regras de segurança:** no Firestore, abra a aba **Regras**, apague o conteúdo, cole o arquivo [`firestore.rules`](firestore.rules) inteiro e clique em **Publicar**.
7. Recarregue o site no Live Server. Agora aparece a tela **Entrar com Google**. 🎉

> O endereço do Live Server (`127.0.0.1`/`localhost`) já vem autorizado no Firebase. Depois de publicar no GitHub Pages, faça o passo 3.4.

---

## 3. Publicar no GitHub (e no GitHub Pages)

### 3.1 Criar o repositório
1. Em <https://github.com/new>, crie um repositório (ex.: `financas`). Ele pode ser **público** (o código não contém dados de ninguém) ou privado. Para usar o GitHub Pages grátis num repositório privado, é preciso um plano pago.
2. Não marque "Add a README", porque este projeto já tem um.

### 3.2 Enviar o código pelo VS Code
1. No VS Code, abra a aba **Controle do Código-Fonte** (`Ctrl+Shift+G`).
2. Clique em **Inicializar Repositório**, escreva uma mensagem (ex.: "Primeira versão") e clique em **Confirmar** (*Commit*).
3. Clique em **Publicar Branch** e escolha o repositório que você criou.

Se preferir o terminal:
```bash
git init
git add .
git commit -m "Primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/financas.git
git push -u origin main
```

### 3.3 Ligar o GitHub Pages
No repositório, vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, depois a branch **main** e a pasta **/ (root)**, e salve. Em 1–2 minutos o site estará em:

```
https://SEU-USUARIO.github.io/financas/
```

### 3.4 Autorizar o domínio no Firebase
No Firebase, vá em **Authentication → Configurações → Domínios autorizados → Adicionar domínio** e adicione `SEU-USUARIO.github.io`. Sem isso, o botão "Entrar com Google" dá erro no site publicado.

### 3.5 Atualizar o site depois
Altere o código, faça *commit* e *push*. O GitHub Pages atualiza sozinho, e quem abrir o app recebe a versão nova.

---

## 4. Usar em vários computadores (namorada, mãe…)

- **Cada pessoa** abre o link do GitHub Pages e entra com a **própria conta Google**. Cada uma tem a sua conta pessoal, totalmente privada.
- **Instalar como aplicativo:** no Chrome ou no Edge, clique no ícone **Instalar** na barra de endereço (ou *menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app*). Fica um ícone na área de trabalho e no menu Iniciar, e o app abre numa janela própria. No celular, use **Adicionar à tela inicial**.
- **Conta conjunta:** quem cria vai em **Conta conjunta → Criar conta conjunta** e envia o **código** para a outra pessoa. Ela entra com a conta Google dela, abre **Conta conjunta → Recebi um código** e cola. Funciona para até 6 pessoas por conta conjunta. Sua mãe, por exemplo, usa só a conta pessoal dela.

---

## 5. Trazer os dados do site antigo (no Claude)

1. No site antigo, vá em **Ajustes → Copiar backup JSON**. Faça isso na conta **Pessoal** e, se usar, depois na **Conjunta**.
2. No app novo, abra a mesma conta (Pessoal ou Conjunta), vá em **Ajustes → Importar backup**, cole o texto e clique em **Importar**.

Importar o mesmo backup duas vezes não duplica nada: os itens são identificados pelo mesmo código.

> Se o backup do site antigo não trouxer os **cartões** (eles só entram no backup a partir da última versão do site antigo), cadastre os cartões e as compras parceladas em andamento de novo na aba **Cartão**. Coloque a data original da compra: as faturas anteriores ao cadastro do cartão são consideradas pagas.

---

## 6. Como o código está organizado

```
financas/
├── index.html              # estrutura da página (menu, topo, áreas vazias que o JS preenche)
├── css/styles.css          # todo o visual (tema claro/escuro, layout responsivo)
├── manifest.webmanifest    # dados do "app instalável" (nome, ícones, cores)
├── sw.js                   # service worker: permite instalar e abrir sem internet
├── firestore.rules         # regras de segurança do banco (copiar para o Firebase)
├── icons/                  # ícones do app
└── js/
    ├── main.js             # ponto de partida: tema, banco (Firebase ou local) e primeiro desenho
    ├── firebase-config.js  # ⚙️ sua configuração do Firebase
    ├── state.js            # o "estado" do app: mês aberto, conta atual, dados carregados…
    ├── bus.js              # changed() (redesenhar) e toast() (avisos)
    ├── render.js           # rotas (#inicio, #cartao…), menu e desenho da tela
    ├── actions.js          # o que acontece em cada clique (data-act="...") e formulário
    ├── selectors.js        # cálculos: totais, fatura, parcelas, renda, quinto dia útil…
    ├── constants.js        # categorias padrão, ciclos de assinatura, cores, taxas
    ├── utils.js            # formatação de dinheiro e datas, ícones, atalhos
    ├── ui.js               # componentes reutilizáveis (cartões, janelas, avisos)
    ├── charts.js           # gráficos de barras e de rosca em SVG (sem bibliotecas)
    ├── data/
    │   ├── store.js        # leitura/escrita dos dados, conta conjunta, backup
    │   ├── local-db.js     # banco do modo local (localStorage)
    │   └── firebase-db.js  # banco do Firebase (mesma interface do local)
    ├── views/              # uma tela por arquivo (inicio, lancamentos, cartao, metas…)
    └── modals/             # uma janela de formulário por arquivo (lançamento, cartão, meta…)
```

**Como as peças conversam**
1. Um clique num botão com `data-act="newTx"` chama `ACT.newTx()` em `actions.js`.
2. A ação grava no banco com `put(...)` (`data/store.js`).
3. O banco avisa da mudança com `onSnapshot`, `store.js` atualiza o `state` e chama `changed()`.
4. `changed()` agenda o `render()`, que chama a view da rota atual (ex.: `views/inicio.js`). A view devolve o HTML da tela, montado a partir do `state` e dos cálculos de `selectors.js`.

Cada módulo importa só o que usa (`import { ... } from './arquivo.js'`), então dá para seguir qualquer função com **F12 (Ir para Definição)** no VS Code.

**Ideias para praticar**
- Adicionar um campo "forma de pagamento" (Pix, débito, dinheiro) nos lançamentos.
- Criar um gráfico de evolução do total economizado.
- Mudar as cores do tema no começo do `css/styles.css` (as variáveis `--accent`, `--bg`…).

---

## 7. Limites do plano gratuito do Firebase

O Firestore gratuito permite cerca de **50 mil leituras e 20 mil gravações por dia**, com **1 GB** de armazenamento. Cada vez que alguém abre o app, ele lê os lançamentos do ano atual. Para algumas pessoas usando no dia a dia, sobra bastante. Se um dia o limite for atingido, o app avisa e volta a funcionar no dia seguinte.

## 8. Privacidade e segurança

- As regras do `firestore.rules` garantem que **só você** lê e grava a sua conta pessoal, e que **só os membros** acessam a conta conjunta.
- **"Google API Key" no alerta do GitHub:** o GitHub avisa sempre que encontra uma chave no formato `AIza...`, mas a `apiKey` do Firebase **não é senha**. Ela só identifica o projeto, e o próprio Firebase orienta deixá-la no código do site. O que protege os dados são as regras do Firestore. Como camada extra, restrinja a chave aos seus endereços:
  1. Abra <https://console.cloud.google.com/apis/credentials> com o projeto do Firebase selecionado e clique na chave **Browser key (auto created by Firebase)**.
  2. Em **Restrições do aplicativo**, escolha **Sites** e adicione `https://SEU-USUARIO.github.io/*`, `https://SEU-PROJETO.firebaseapp.com/*` (é dele que vem a janela de login do Google), `http://127.0.0.1:5500/*` e `http://localhost:5500/*`.
  3. Salve. A mudança pode levar alguns minutos para valer. Depois, feche o alerta no GitHub como **Won't fix**, com um comentário do tipo "chave pública do Firebase, restrita por domínio".
- **O que nunca pode ir para o GitHub:** chaves de *service account* (arquivos JSON com `private_key`) e chaves de outros serviços pagos.
- O código da conta conjunta funciona como uma senha: envie só para quem deve entrar.
- Os backups baixados (`financas-*.json`) contêm seus dados financeiros. O `.gitignore` já impede que eles sejam enviados ao GitHub por engano.
