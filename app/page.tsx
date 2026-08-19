'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createAudioManager, DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '@/src/audio';
import { getStoredLanguage, isLanguage, LANGUAGE_CHANGE_EVENT } from '@/src/client/language';
import type { Language } from '@/src/domain/mission-contracts';

const UI_COPY = {
  portuguese: {
    canvasLabel: 'Cidade interativa em três dimensões',
    education: 'Educação urbana',
    indicatorsLabel: 'Indicadores da cidade',
    residents: 'Moradores',
    satisfaction: 'Satisfação',
    resources: 'Recursos',
    day: 'Dia 1',
    soundOff: 'Som desligado',
    sound: 'Som',
    audioControls: 'Controles de áudio',
    citySounds: 'Sons da cidade',
    audioHint: 'Ajuste como preferir',
    enable: 'Ativar',
    mute: 'Silenciar',
    soundtrack: 'Trilha sonora',
    missionIndex: 'Missão 1 de 4',
    missionTitle: 'A Nova Escola',
    mayor: 'Prefeito AI',
    question: 'A cidade cresceu e precisa de uma escola pública.',
    progressLabel: 'Progresso das missões',
    next: 'Próxima missão',
    cameraControls: 'Controles de câmera',
    overview: 'Visão geral',
    focus: 'Focar na missão',
    help: 'Arraste para girar · Role para aproximar · Clique na obra',
    loading: 'Construindo a cidade…',
  },
  english: {
    canvasLabel: 'Interactive three-dimensional city',
    education: 'Urban education',
    indicatorsLabel: 'City indicators',
    residents: 'Residents',
    satisfaction: 'Satisfaction',
    resources: 'Resources',
    day: 'Day 1',
    soundOff: 'Sound off',
    sound: 'Sound',
    audioControls: 'Audio controls',
    citySounds: 'City sounds',
    audioHint: 'Adjust as you prefer',
    enable: 'Enable',
    mute: 'Mute',
    soundtrack: 'Soundtrack',
    missionIndex: 'Mission 1 of 4',
    missionTitle: 'The New School',
    mayor: 'AI Mayor',
    question: 'The city has grown and needs a public school.',
    progressLabel: 'Mission progress',
    next: 'Next mission',
    cameraControls: 'Camera controls',
    overview: 'Overview',
    focus: 'Focus mission',
    help: 'Drag to rotate · Scroll to zoom · Click the construction site',
    loading: 'Building the city…',
  },
} as const satisfies Record<Language, Record<string, string>>;

export default function HomePage() {
  const audioRef = useRef<ReturnType<typeof createAudioManager> | null>(null);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({ ...DEFAULT_AUDIO_PREFERENCES });
  const [language, setLanguage] = useState<Language>('portuguese');
  const copy = UI_COPY[language];

  useEffect(() => {
    void import('@/src/game/main');

    const audio = createAudioManager();
    audioRef.current = audio;
    const preferencesFrame = window.requestAnimationFrame(() => {
      setAudioPreferences({ ...audio.getPreferences() });
    });

    const startAudio = () => audio.start();
    window.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });

    return () => {
      window.cancelAnimationFrame(preferencesFrame);
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
      audio.stop();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    setLanguage(getStoredLanguage(window.localStorage));

    const handleLanguageChange = (event: Event) => {
      const nextLanguage = (event as CustomEvent<unknown>).detail;
      if (isLanguage(nextLanguage)) setLanguage(nextLanguage);
    };
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  }, []);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    const muted = !audioPreferences.muted;
    audio.start();
    audio.setMuted(muted);
    setAudioPreferences((current) => ({ ...current, muted }));
  }

  function toggleAudioMenu() {
    audioRef.current?.start();
    setAudioMenuOpen((open) => !open);
  }

  function changeMusicVolume(event: ChangeEvent<HTMLInputElement>) {
    const musicVolume = Number(event.target.value);
    audioRef.current?.start();
    audioRef.current?.setMusicVolume(musicVolume);
    setAudioPreferences((current) => ({ ...current, musicVolume }));
  }

  function changeAmbienceVolume(event: ChangeEvent<HTMLInputElement>) {
    const ambienceVolume = Number(event.target.value);
    audioRef.current?.start();
    audioRef.current?.setAmbienceVolume(ambienceVolume);
    setAudioPreferences((current) => ({ ...current, ambienceVolume }));
  }

  return (
    <main id="app">
      <canvas id="cidade" aria-label={copy.canvasLabel} />

      <header className="barra-superior">
        <div className="marca">
          <span className="marca-simbolo" aria-hidden="true" />
          <div><strong>AI City</strong><small>{copy.education}</small></div>
        </div>
        <div className="indicadores" aria-label={copy.indicatorsLabel}>
          <div><span>{copy.residents}</span><strong id="moradores">8.420</strong></div>
          <div><span>{copy.satisfaction}</span><strong id="satisfacao">72%</strong></div>
          <div><span>{copy.resources}</span><strong id="recursos">R$ 2.400.000</strong></div>
        </div>
        <div className="relogio" id="relogio">{copy.day} · 09:00</div>
        <div className="audio-menu">
          <button
            className="audio-toggle"
            type="button"
            aria-expanded={audioMenuOpen}
            aria-controls="audio-controles"
            onClick={toggleAudioMenu}
          >
            <span aria-hidden="true">♪</span>
            {audioPreferences.muted ? copy.soundOff : copy.sound}
          </button>

          {audioMenuOpen && (
            <section className="audio-painel" id="audio-controles" aria-label={copy.audioControls}>
              <div className="audio-painel-cabecalho">
                <div>
                  <strong>{copy.citySounds}</strong>
                  <small>{copy.audioHint}</small>
                </div>
                <button
                  className="audio-master"
                  type="button"
                  aria-pressed={audioPreferences.muted}
                  onClick={toggleAudio}
                >
                  {audioPreferences.muted ? copy.enable : copy.mute}
                </button>
              </div>

              <label className="audio-controle">
                <span>
                  {copy.soundtrack}
                  <output>{Math.round(audioPreferences.musicVolume * 100)}%</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioPreferences.musicVolume}
                  onChange={changeMusicVolume}
                />
              </label>

              <label className="audio-controle">
                <span>
                  {copy.citySounds}
                  <output>{Math.round(audioPreferences.ambienceVolume * 100)}%</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioPreferences.ambienceVolume}
                  onChange={changeAmbienceVolume}
                />
              </label>
            </section>
          )}
        </div>
      </header>

      <section className="projeto" aria-labelledby="missao-titulo">
        <div className="projeto-cabecalho">
          <span className="etiqueta" id="missao-indice">{copy.missionIndex}</span>
          <span className="prazo" id="tempo-jogo">00:00</span>
        </div>
        <h1 id="missao-titulo">{copy.missionTitle}</h1>
        <span className="personagem" id="personagem">{copy.mayor}</span>
        <p id="pergunta">{copy.question}</p>
        <div className="progresso" aria-label={copy.progressLabel}>
          <span id="progresso-barra" />
        </div>
        <div className="progresso-legenda">
          <span id="fase">{copy.missionTitle}</span>
          <strong id="percentual">0%</strong>
        </div>
        <div className="escolhas" id="escolhas" />
        <div className="resultado oculto" id="resultado">
          <p id="resultado-texto" />
          <div className="impactos" id="impactos" />
          <button id="proximo" type="button">{copy.next}</button>
        </div>
      </section>

      <nav className="camera" aria-label={copy.cameraControls}>
        <button id="visao-geral" type="button">{copy.overview}</button>
        <button id="focar-missao" type="button">{copy.focus}</button>
      </nav>

      <p className="ajuda">{copy.help}</p>
      <div className="carregando" id="carregando"><span />{copy.loading}</div>
      <div className="aviso" id="aviso" role="status" aria-live="polite" />
    </main>
  );
}
