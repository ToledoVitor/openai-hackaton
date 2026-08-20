import { getStoredLanguage, LANGUAGE_CHANGE_EVENT, setPlayerLanguage } from '../client/language';
import { brandWordmarkMarkup } from '../client/brand-wordmark';
import { uiText } from '../client/ui-copy';
import type { Language } from '../domain/mission-contracts';
import {
  applyEntryAudioCommand,
  AUDIO_PREFERENCES_CHANGE_EVENT,
  entryAudioView,
  type EntryAudioCommand,
} from '../audio/entryAudioControls';
import { entryCityBackdropMarkup } from './entry-presentation';

export type PlayerProfile = { name: string; language: Language };

export function mostrarEntrada() {
  return new Promise<PlayerProfile>((resolver) => {
    const app = document.querySelector<HTMLElement>('#app')!;
    const entrada = document.createElement('section');
    let language = getStoredLanguage(window.localStorage);
    entrada.className = 'entrada';
    entrada.dataset.etapa = 'inicio';
    entrada.innerHTML = `
      <div class="entrada-luz" aria-hidden="true"></div>
      ${entryCityBackdropMarkup()}
      <div class="entrada-som" role="group">
        <span class="entrada-som__titulo" data-copy="audio"></span>
        <button type="button" data-audio-command="toggle_mute"><span data-audio-icon aria-hidden="true">♪</span></button>
        <button type="button" data-audio-command="volume_down" aria-label=""><span aria-hidden="true">−</span></button>
        <output data-audio-level aria-live="polite"></output>
        <button type="button" data-audio-command="volume_up" aria-label=""><span aria-hidden="true">+</span></button>
      </div>
      <div class="entrada-idioma" role="group">
        <span data-copy="language_label"></span>
        <button type="button" data-language="portuguese">Português</button>
        <button type="button" data-language="english">English</button>
      </div>
      <div class="entrada-inicio">
        ${brandWordmarkMarkup('hero')}
        <div class="entrada-convite">
          <button class="entrada-comecar" type="button">
            <span data-copy="start"></span>
            <small data-copy="start_hint"></small>
          </button>
          <p data-copy="tagline"></p>
        </div>
      </div>
      <form class="entrada-perfil" autocomplete="off">
        ${brandWordmarkMarkup('profile')}
        <div class="entrada-cartao">
          <span class="entrada-etiqueta" data-copy="before_start"></span>
          <h1 data-copy="name_question"></h1>
          <p data-copy="name_help"></p>
          <label for="nome-jogador" data-copy="name_label"></label>
          <input id="nome-jogador" name="nome" type="text" minlength="2" maxlength="32" required />
          <span class="entrada-erro" role="alert"></span>
          <button type="submit" data-copy="enter_city"></button>
          <button class="entrada-voltar" type="button" data-copy="back"></button>
        </div>
      </form>
      <span class="entrada-versao" data-copy="prototype"></span>
    `;

    const comecar = entrada.querySelector<HTMLButtonElement>('.entrada-comecar')!;
    const voltar = entrada.querySelector<HTMLButtonElement>('.entrada-voltar')!;
    const formulario = entrada.querySelector<HTMLFormElement>('.entrada-perfil')!;
    const nome = entrada.querySelector<HTMLInputElement>('#nome-jogador')!;
    const erro = entrada.querySelector<HTMLElement>('.entrada-erro')!;
    const audioGroup = entrada.querySelector<HTMLElement>('.entrada-som')!;
    const audioButtons = [...entrada.querySelectorAll<HTMLButtonElement>('[data-audio-command]')];
    const muteButton = entrada.querySelector<HTMLButtonElement>('[data-audio-command="toggle_mute"]')!;
    const audioIcon = entrada.querySelector<HTMLElement>('[data-audio-icon]')!;
    const audioLevel = entrada.querySelector<HTMLOutputElement>('[data-audio-level]')!;

    function renderAudio() {
      const audio = window.cidadeAudio;
      audioButtons.forEach((button) => { button.disabled = !audio; });
      if (!audio) {
        audioLevel.textContent = '—';
        return;
      }
      const preferences = audio.getPreferences();
      const view = entryAudioView(language, preferences);
      audioGroup.setAttribute('aria-label', view.groupLabel);
      muteButton.setAttribute('aria-label', view.muteLabel);
      muteButton.setAttribute('aria-pressed', String(preferences.muted));
      audioIcon.textContent = preferences.muted ? '×' : '♪';
      const down = entrada.querySelector<HTMLButtonElement>('[data-audio-command="volume_down"]')!;
      const up = entrada.querySelector<HTMLButtonElement>('[data-audio-command="volume_up"]')!;
      down.setAttribute('aria-label', view.volumeDownLabel);
      up.setAttribute('aria-label', view.volumeUpLabel);
      audioLevel.textContent = view.levelText;
      audioLevel.setAttribute('aria-label', view.levelLabel);
    }

    function renderLanguage(nextLanguage: Language) {
      language = nextLanguage;
      document.documentElement.lang = language === 'portuguese' ? 'pt-BR' : 'en';
      entrada.setAttribute('aria-label', language === 'portuguese' ? 'Boas-vindas ao AI City' : 'Welcome to AI City');
      entrada.querySelectorAll<HTMLElement>('[data-copy]').forEach((element) => {
        element.textContent = uiText(language, element.dataset.copy ?? '');
      });
      nome.placeholder = uiText(language, 'name_placeholder');
      entrada.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) => {
        const selected = button.dataset.language === language;
        button.classList.toggle('ativo', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      if (erro.textContent) erro.textContent = uiText(language, 'name_error');
      renderAudio();
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

    entrada.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const nextLanguage = button.dataset.language as Language;
        setPlayerLanguage(nextLanguage);
        renderLanguage(nextLanguage);
      });
    });
    audioButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const audio = window.cidadeAudio;
        if (!audio) return;
        const preferences = applyEntryAudioCommand(audio, button.dataset.audioCommand as EntryAudioCommand);
        window.dispatchEvent(new CustomEvent(AUDIO_PREFERENCES_CHANGE_EVENT, { detail: preferences }));
        renderAudio();
      });
    });
    const onLanguageChange = (event: Event) => renderLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
    comecar.addEventListener('click', (event) => { event.stopPropagation(); abrirPerfil(); });
    voltar.addEventListener('click', (event) => { event.stopPropagation(); abrirInicio(); });
    entrada.addEventListener('click', () => {
      if (entrada.dataset.etapa === 'inicio') abrirPerfil();
    });
    entrada.addEventListener('keydown', (evento) => {
      if (evento.target === entrada && (evento.key === 'Enter' || evento.key === ' ') && entrada.dataset.etapa === 'inicio') {
        evento.preventDefault();
        abrirPerfil();
      }
      if (evento.key === 'Escape' && entrada.dataset.etapa === 'nome') abrirInicio();
    });
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const nomeJogador = nome.value.trim();
      if (nomeJogador.length < 2) {
        erro.textContent = uiText(language, 'name_error');
        nome.focus();
        return;
      }
      if (entrada.dataset.enviado) return;
      entrada.dataset.enviado = '1';
      entrada.classList.add('entrada-saindo');
      app.classList.remove('entrada-ativa');
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange);
      resolver({ name: nomeJogador, language });
      window.setTimeout(() => entrada.remove(), 620);
    });

    renderLanguage(language);
    app.classList.add('entrada-ativa');
    app.append(entrada);
    comecar.focus();
  });
}
