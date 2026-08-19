'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createAudioManager, DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '@/src/audio';

type CityAudio = ReturnType<typeof createAudioManager>;

declare global {
  interface Window {
    cidadeAudio?: CityAudio;
  }
}

export default function HomePage() {
  const audioRef = useRef<CityAudio | null>(null);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({ ...DEFAULT_AUDIO_PREFERENCES });

  useEffect(() => {
    const audio = createAudioManager();
    audioRef.current = audio;
    window.cidadeAudio = audio;
    const frame = window.requestAnimationFrame(() => {
      setAudioPreferences({ ...audio.getPreferences() });
    });

    const startAudio = () => audio.start();
    window.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });
    void import('@/src/game/main');

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
      audio.stop();
      delete window.cidadeAudio;
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
          <img className="marca-logo" src="/assets/brand/ai-city-logo.png" alt="AI City" />
        </div>
        <div className="indicadores" aria-label="Progresso de aprendizagem">
          <div><span>Missões concluídas</span><strong id="missoes-concluidas">0 de 1</strong></div>
          <div><span>Conceito atual</span><strong id="conceito-atual">Prompt</strong></div>
          <div><span>Aprendizados</span><strong id="aprendizados">0 de 1</strong></div>
        </div>
        <div className="relogio oculto" id="relogio" aria-hidden="true">Dia 1 · 09:00</div>
        <div className="audio-menu">
          <button
            className="audio-toggle"
            type="button"
            aria-expanded={audioMenuOpen}
            aria-controls="audio-controles"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              toggleAudioMenu();
            }}
          >
            <span aria-hidden="true">♪</span>
            {audioPreferences.muted ? 'Som desligado' : 'Som'}
          </button>

          {audioMenuOpen ? (
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
          ) : null}
        </div>
      </header>

      <section className="projeto" aria-labelledby="missao-titulo">
        <div className="projeto-cabecalho">
          <span className="etiqueta" id="missao-indice">Missão 1 de 1</span>
          <span className="prazo" id="tempo-jogo">00:00</span>
        </div>
        <h1 id="missao-titulo">A Nova Escola</h1>
        <span className="personagem" id="personagem">Prefeito</span>
        <p id="pergunta">Converse com o Prefeito e oriente a construção até a escola atender às crianças do bairro.</p>

        <div className="guia-prompt oculto" id="guia-prompt">
          <div className="objetivo-prompt">
            <span>Objetivo da missão</span>
            <strong id="objetivo-prompt-texto">Construa uma escola com um prompt</strong>
          </div>

          <div className="fala-prefeito" aria-live="polite">
            <span className="prefeito-avatar" aria-hidden="true">P</span>
            <div>
              <strong>Prefeito · conversa em tempo real</strong>
              <p id="fala-prefeito">Peça a escola do seu jeito; os construtores seguirão exatamente o que você disser.</p>
            </div>
          </div>

          <div className="etapas-prompt" aria-label="Etapas da missão">
            <span className="ativa" data-prompt-etapa="1"><b>1</b> Explique a ideia</span>
            <span data-prompt-etapa="2"><b>2</b> Veja a construção</span>
            <span data-prompt-etapa="3"><b>3</b> Ajuste com o Prefeito</span>
          </div>

          <div className="compositor-prompt" id="prompt-form">
            <div className="controles-voz">
              <button className="botao-voz" id="prompt-voz" type="button" aria-label="Falar com o Prefeito">
                <span className="icone-microfone" aria-hidden="true" />
                <b>Pausar conversa</b>
                <i aria-hidden="true"><span /><span /><span /><span /><span /></i>
              </button>
              <button className="botao-mutar mutado" id="prompt-mutar" type="button" aria-pressed="true" aria-label="Ativar microfone">
                <span aria-hidden="true" />
                <b>Ativar</b>
              </button>
            </div>
            <small className="oculto" id="prompt-status" aria-live="polite" />
          </div>

          <button className="alternar-opcoes" id="alternar-opcoes" type="button">Prefiro escolher uma opção</button>

          <div className="prompt-blueprint oculto" id="prompt-blueprint">
            <strong>Um bom prompt explica:</strong>
            <div>
              <span data-blueprint="objetivo">Objetivo</span>
              <span data-blueprint="contexto">Contexto</span>
              <span data-blueprint="restricoes">Restrições</span>
              <span data-blueprint="resultado">Resultado esperado</span>
            </div>
          </div>
        </div>
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
        <button className="ativo" id="focar-missao" type="button">Focar na missão</button>
      </nav>

      <div className="carregando" id="carregando"><span />Construindo a cidade…</div>
      <div className="aviso" id="aviso" role="status" aria-live="polite" />
    </main>
  );
}
