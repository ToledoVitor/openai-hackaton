const LOGO = '/assets/brand/ai-city-logo.png';

export function mostrarEntrada() {
  return new Promise<string>((resolver) => {
    const app = document.querySelector<HTMLElement>('#app')!;
    const entrada = document.createElement('section');
    entrada.className = 'entrada';
    entrada.dataset.etapa = 'inicio';
    entrada.setAttribute('aria-label', 'Boas-vindas ao AI City');
    entrada.innerHTML = `
      <div class="entrada-luz" aria-hidden="true"></div>

      <div class="entrada-inicio">
        <p class="entrada-chamada">Sua voz ajuda a construir o futuro</p>
        <img class="entrada-logo" src="${LOGO}" alt="AI City" />
        <div class="entrada-convite">
          <button class="entrada-comecar" type="button">
            <span>Começar</span>
            <small>clique ou pressione Espaço</small>
          </button>
          <p>Uma cidade feita de escolhas, educação e inteligência artificial.</p>
        </div>
      </div>

      <form class="entrada-perfil" autocomplete="off">
        <img class="entrada-logo-menor" src="${LOGO}" alt="AI City" />
        <div class="entrada-cartao">
          <span class="entrada-etiqueta">Antes de começar</span>
          <h1>Como podemos chamar você?</h1>
          <p>O prefeito está esperando para apresentar a primeira missão.</p>
          <label for="nome-jogador">Seu nome</label>
          <input id="nome-jogador" name="nome" type="text" minlength="2" maxlength="32" placeholder="Digite seu nome" required />
          <span class="entrada-erro" role="alert"></span>
          <button type="submit">Entrar em AI City</button>
          <button class="entrada-voltar" type="button">Voltar</button>
        </div>
      </form>

      <span class="entrada-versao">Protótipo do hackathon da OpenAI</span>
    `;

    const comecar = entrada.querySelector<HTMLButtonElement>('.entrada-comecar')!;
    const voltar = entrada.querySelector<HTMLButtonElement>('.entrada-voltar')!;
    const formulario = entrada.querySelector<HTMLFormElement>('.entrada-perfil')!;
    const nome = entrada.querySelector<HTMLInputElement>('#nome-jogador')!;
    const erro = entrada.querySelector<HTMLElement>('.entrada-erro')!;

    function abrirPerfil() {
      entrada.dataset.etapa = 'nome';
      window.setTimeout(() => nome.focus(), 380);
    }

    function abrirInicio() {
      entrada.dataset.etapa = 'inicio';
      erro.textContent = '';
      comecar.focus();
    }

    comecar.addEventListener('click', abrirPerfil);
    voltar.addEventListener('click', abrirInicio);
    entrada.addEventListener('click', () => {
      if (entrada.dataset.etapa === 'inicio') abrirPerfil();
    });
    entrada.addEventListener('keydown', (evento) => {
      if ((evento.key === 'Enter' || evento.key === ' ') && entrada.dataset.etapa === 'inicio') {
        evento.preventDefault();
        abrirPerfil();
      }
      if (evento.key === 'Escape' && entrada.dataset.etapa === 'nome') abrirInicio();
    });
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const nomeJogador = nome.value.trim();
      if (nomeJogador.length < 2) {
        erro.textContent = 'Digite pelo menos duas letras.';
        nome.focus();
        return;
      }

      entrada.classList.add('entrada-saindo');
      app.classList.remove('entrada-ativa');
      window.setTimeout(() => {
        entrada.remove();
        resolver(nomeJogador);
      }, 620);
    });

    app.classList.add('entrada-ativa');
    app.append(entrada);
    comecar.focus();
  });
}
