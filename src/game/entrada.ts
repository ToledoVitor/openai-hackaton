import { getStoredLanguage, isLanguage, setPlayerLanguage } from '../client/language';
import type { Language } from '../domain/mission-contracts';

const LOGO = '/assets/brand/ai-city-logo.png';

export type PlayerProfile = {
  playerName: string;
  language: Language;
};

const COPY = {
  portuguese: {
    welcomeLabel: 'Boas-vindas ao AI City',
    tagline: 'Sua voz ajuda a construir o futuro',
    start: 'Começar',
    startHint: 'clique ou pressione Espaço',
    invitation: 'Uma cidade feita de escolhas, educação e inteligência artificial.',
    preface: 'Antes de começar',
    title: 'Como podemos chamar você?',
    description: 'O prefeito está esperando para apresentar a primeira missão.',
    nameLabel: 'Seu nome',
    namePlaceholder: 'Digite seu nome',
    languageLabel: 'Idioma do jogo e da voz',
    submit: 'Entrar em AI City',
    back: 'Voltar',
    nameError: 'Digite pelo menos duas letras.',
    version: 'Protótipo do hackathon da OpenAI',
  },
  english: {
    welcomeLabel: 'Welcome to AI City',
    tagline: 'Your voice helps build the future',
    start: 'Start',
    startHint: 'click or press Space',
    invitation: 'A city shaped by choices, education, and artificial intelligence.',
    preface: 'Before starting',
    title: 'What should we call you?',
    description: 'The mayor is waiting to present your first mission.',
    nameLabel: 'Your name',
    namePlaceholder: 'Enter your name',
    languageLabel: 'Game and voice language',
    submit: 'Enter AI City',
    back: 'Back',
    nameError: 'Enter at least two letters.',
    version: 'OpenAI hackathon prototype',
  },
} as const satisfies Record<Language, Record<string, string>>;

export function mostrarEntrada() {
  return new Promise<PlayerProfile>((resolver) => {
    const app = document.querySelector<HTMLElement>('#app')!;
    let language = getStoredLanguage(window.localStorage);
    const copy = COPY[language];
    const entrada = document.createElement('section');
    entrada.className = 'entrada';
    entrada.dataset.etapa = 'inicio';
    entrada.setAttribute('aria-label', copy.welcomeLabel);
    entrada.innerHTML = `
      <div class="entrada-luz" aria-hidden="true"></div>

      <div class="entrada-inicio">
        <p class="entrada-chamada" data-copy="tagline">${copy.tagline}</p>
        <img class="entrada-logo" src="${LOGO}" alt="AI City" />
        <div class="entrada-convite">
          <button class="entrada-comecar" type="button">
            <span data-copy="start">${copy.start}</span>
            <small data-copy="startHint">${copy.startHint}</small>
          </button>
          <p data-copy="invitation">${copy.invitation}</p>
        </div>
      </div>

      <form class="entrada-perfil" autocomplete="off">
        <img class="entrada-logo-menor" src="${LOGO}" alt="AI City" />
        <div class="entrada-cartao">
          <span class="entrada-etiqueta" data-copy="preface">${copy.preface}</span>
          <h1 data-copy="title">${copy.title}</h1>
          <p data-copy="description">${copy.description}</p>
          <label for="nome-jogador" data-copy="nameLabel">${copy.nameLabel}</label>
          <input id="nome-jogador" name="nome" type="text" minlength="2" maxlength="32" placeholder="${copy.namePlaceholder}" required />
          <fieldset class="entrada-idioma">
            <legend data-copy="languageLabel">${copy.languageLabel}</legend>
            <div class="entrada-idioma-opcoes">
              <label>
                <input type="radio" name="idioma" value="portuguese" ${language === 'portuguese' ? 'checked' : ''} />
                <span>Português</span>
              </label>
              <label>
                <input type="radio" name="idioma" value="english" ${language === 'english' ? 'checked' : ''} />
                <span>English</span>
              </label>
            </div>
          </fieldset>
          <span class="entrada-erro" role="alert"></span>
          <button type="submit" data-copy="submit">${copy.submit}</button>
          <button class="entrada-voltar" type="button" data-copy="back">${copy.back}</button>
        </div>
      </form>

      <span class="entrada-versao" data-copy="version">${copy.version}</span>
    `;

    const comecar = entrada.querySelector<HTMLButtonElement>('.entrada-comecar')!;
    const voltar = entrada.querySelector<HTMLButtonElement>('.entrada-voltar')!;
    const formulario = entrada.querySelector<HTMLFormElement>('.entrada-perfil')!;
    const nome = entrada.querySelector<HTMLInputElement>('#nome-jogador')!;
    const erro = entrada.querySelector<HTMLElement>('.entrada-erro')!;

    function aplicarIdioma(nextLanguage: Language) {
      language = nextLanguage;
      const nextCopy = COPY[language];
      entrada.setAttribute('aria-label', nextCopy.welcomeLabel);
      document.documentElement.lang = language === 'portuguese' ? 'pt-BR' : 'en';
      nome.placeholder = nextCopy.namePlaceholder;
      erro.textContent = '';

      for (const element of entrada.querySelectorAll<HTMLElement>('[data-copy]')) {
        const key = element.dataset.copy as keyof typeof nextCopy;
        element.textContent = nextCopy[key];
      }

      setPlayerLanguage(language);
    }

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
    formulario.addEventListener('change', (evento) => {
      const target = evento.target;
      if (target instanceof HTMLInputElement && target.name === 'idioma' && isLanguage(target.value)) {
        aplicarIdioma(target.value);
      }
    });
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
      const playerName = nome.value.trim();
      if (playerName.length < 2) {
        erro.textContent = COPY[language].nameError;
        nome.focus();
        return;
      }

      setPlayerLanguage(language);
      entrada.classList.add('entrada-saindo');
      app.classList.remove('entrada-ativa');
      window.setTimeout(() => {
        entrada.remove();
        resolver({ playerName, language });
      }, 620);
    });

    document.documentElement.lang = language === 'portuguese' ? 'pt-BR' : 'en';
    app.classList.add('entrada-ativa');
    app.append(entrada);
    comecar.focus();
  });
}
