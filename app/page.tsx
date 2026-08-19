'use client';

import { useEffect, useRef, useState } from 'react';
import { createAudioManager } from '@/src/audio';

export default function HomePage() {
  const audioRef = useRef<ReturnType<typeof createAudioManager> | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  useEffect(() => {
    void import('@/src/game/main');

    const audio = createAudioManager();
    audioRef.current = audio;
    setAudioMuted(audio.getPreferences().muted);

    const startAudio = () => audio.start();
    window.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
      audio.stop();
      audioRef.current = null;
    };
  }, []);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    const muted = !audioMuted;
    audio.start();
    audio.setMuted(muted);
    setAudioMuted(muted);
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
        <button
          className="audio-toggle"
          type="button"
          aria-pressed={audioMuted}
          onClick={toggleAudio}
        >
          {audioMuted ? 'Ativar som' : 'Silenciar som'}
        </button>
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
