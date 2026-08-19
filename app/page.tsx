'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createAudioManager, DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '@/src/audio';

export default function HomePage() {
  const audioRef = useRef<ReturnType<typeof createAudioManager> | null>(null);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({ ...DEFAULT_AUDIO_PREFERENCES });

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
      <canvas id="cidade" aria-label="Cidade interativa em três dimensões" />

      <header className="barra-superior">
        <div className="marca">
          <span className="marca-simbolo" aria-hidden="true" />
          <div><strong>AI City</strong><small>Educação urbana</small></div>
        </div>
        <div className="indicadores" aria-label="Indicadores da cidade">
          <div><span>Moradores</span><strong id="moradores">8.420</strong></div>
          <div><span>Satisfação</span><strong id="satisfacao">72%</strong></div>
          <div><span>Recursos</span><strong id="recursos">R$ 2.400.000</strong></div>
        </div>
        <div className="relogio" id="relogio">Dia 1 · 09:00</div>
        <div className="audio-menu">
          <button
            className="audio-toggle"
            type="button"
            aria-expanded={audioMenuOpen}
            aria-controls="audio-controles"
            onClick={toggleAudioMenu}
          >
            <span aria-hidden="true">♪</span>
            {audioPreferences.muted ? 'Som desligado' : 'Som'}
          </button>

          {audioMenuOpen && (
            <section className="audio-painel" id="audio-controles" aria-label="Controles de áudio">
              <div className="audio-painel-cabecalho">
                <div>
                  <strong>Sons da cidade</strong>
                  <small>Ajuste como preferir</small>
                </div>
                <button
                  className="audio-master"
                  type="button"
                  aria-pressed={audioPreferences.muted}
                  onClick={toggleAudio}
                >
                  {audioPreferences.muted ? 'Ativar' : 'Silenciar'}
                </button>
              </div>

              <label className="audio-controle">
                <span>
                  Trilha sonora
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
                  Sons da cidade
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
          <span className="etiqueta" id="missao-indice">Missão 1 de 4</span>
          <span className="prazo" id="tempo-jogo">00:00</span>
        </div>
        <h1 id="missao-titulo">A Nova Escola</h1>
        <span className="personagem" id="personagem">Prefeito AI</span>
        <p id="pergunta">A cidade cresceu e precisa de uma escola pública.</p>
        <div className="progresso" aria-label="Progresso das missões">
          <span id="progresso-barra" />
        </div>
        <div className="progresso-legenda">
          <span id="fase">A Nova Escola</span>
          <strong id="percentual">0%</strong>
        </div>
        <div className="escolhas" id="escolhas" />
        <div className="resultado oculto" id="resultado">
          <p id="resultado-texto" />
          <div className="impactos" id="impactos" />
          <button id="proximo" type="button">Próxima missão</button>
        </div>
      </section>

      <nav className="camera" aria-label="Controles de câmera">
        <button id="visao-geral" type="button">Visão geral</button>
        <button id="focar-missao" type="button">Focar na missão</button>
      </nav>

      <p className="ajuda">Arraste para girar · Role para aproximar · Clique na obra</p>
      <div className="carregando" id="carregando"><span />Construindo a cidade…</div>
      <div className="aviso" id="aviso" role="status" aria-live="polite" />
    </main>
  );
}
