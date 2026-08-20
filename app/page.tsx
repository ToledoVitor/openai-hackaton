'use client';

import { memo, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createAudioManager, DEFAULT_AUDIO_PREFERENCES, type AudioPreferences } from '@/src/audio';
import { BrandWordmark } from '@/src/client/brand-wordmark';
import { getStoredLanguage, LANGUAGE_CHANGE_EVENT, setPlayerLanguage } from '@/src/client/language';
import { uiText } from '@/src/client/ui-copy';
import type { Language } from '@/src/domain/mission-contracts';

type CityAudio = ReturnType<typeof createAudioManager>;

declare global {
  interface Window { cidadeAudio?: CityAudio }
}

const GameUi = memo(function GameUi() {
  return (
    <>
      <canvas id="cidade" aria-label="Cidade 3D interativa de AI City" />

      <aside className="estado-cidade" aria-labelledby="estado-titulo">
        <div className="estado-cabecalho">
          <span id="estado-titulo" />
          <strong id="missoes-concluidas">0 / 3</strong>
        </div>
        <dl>
          <div><dt id="rotulo-dia" /><dd id="dia-cidade">1</dd></div>
          <div><dt id="rotulo-orcamento" /><dd id="orcamento-cidade">R$ 2,4 mi</dd></div>
          <div><dt id="rotulo-bem-estar" /><dd id="bem-estar-cidade">72%</dd></div>
        </dl>
        <div className="proxima-recomendada">
          <span id="rotulo-recomendada" />
          <strong id="missao-recomendada" />
        </div>
      </aside>

      <section className="projeto" aria-labelledby="missao-titulo">
        <nav className="lista-missoes" id="lista-missoes" aria-label="Missões de aprendizagem" />
        <div className="escolha-missao" id="escolha-missao">
          <span className="etiqueta" id="escolha-missao-etiqueta" />
          <h1 id="escolha-missao-titulo" />
          <p id="escolha-missao-ajuda" />
        </div>
        <div className="oculto" id="missao-conteudo">
        <div className="projeto-cabecalho">
          <span className="etiqueta" id="missao-indice" />
          <span className="estado-missao" id="estado-missao" />
        </div>
        <h1 id="missao-titulo" />
        <p className="personagem" id="personagem" />

        <div className="missao-resumo">
          <div><span id="rotulo-conceito" /><strong id="missao-conceito" /></div>
          <div><span id="rotulo-objetivo" /><p id="missao-objetivo" /></div>
          <div><span id="rotulo-resultado" /><p id="missao-resultado" /></div>
          <div><span id="rotulo-proposito" /><p id="missao-proposito" /></div>
        </div>

        <div className="briefing">
          <span id="rotulo-briefing" />
          <p id="missao-briefing" />
        </div>

        <div className="progresso" aria-hidden="true"><span id="progresso-barra" /></div>
        <div className="progresso-legenda">
          <span id="fase" />
          <strong id="percentual">0%</strong>
        </div>

        <form className="compositor-prompt" id="prompt-form">
          <label htmlFor="prompt-texto" id="rotulo-plano" />
          <textarea id="prompt-texto" rows={5} maxLength={600} required />
          <div className="acoes-prompt">
            <button className="acao-principal" id="avaliar-plano" type="submit" />
            <button className="acao-secundaria" id="mostrar-dica" type="button" />
          </div>
          <p className="dica-missao oculto" id="dica-missao" />
          <div className="voz-opcional">
            <button className="acao-secundaria" id="prompt-voz" type="button" />
            <div className="voz-meta">
              <strong id="voz-estado" role="status" aria-live="polite" />
              <small id="voz-ajuda" />
            </div>
            <button className="acao-texto" id="voltar-texto" type="button" hidden />
          </div>
          <p id="prompt-status" role="status" aria-live="polite" />
        </form>

        <section className="resultado oculto" id="resultado" aria-labelledby="rotulo-feedback">
          <span id="rotulo-feedback" />
          <h2 id="resultado-titulo" />
          <p id="resultado-texto" />
          <p id="resultado-instrucao" />
          <button className="acao-principal oculto" id="proximo" type="button" />
        </section>
        </div>
      </section>

      <aside className="npc-painel" aria-labelledby="rotulo-npc">
        <span id="rotulo-npc" />
        <strong id="npc-nome" />
        <p id="npc-fala" />
        <div className="npc-abas" id="npc-abas" />
      </aside>

      <nav className="camera" id="controles-camera" aria-label="Controles da câmera">
        <button id="visao-geral" type="button" />
        <button className="ativo" id="focar-missao" type="button" />
      </nav>
      <p className="ajuda-exploracao" id="ajuda-exploracao" />
      <div className="carregando" id="carregando">
        <span />
        <b id="carregando-texto" />
        <button id="recarregar-cidade" type="button" hidden />
      </div>
      <div className="aviso" id="aviso" role="status" aria-live="polite" />
    </>
  );
});

export default function HomePage() {
  const audioRef = useRef<CityAudio | null>(null);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({ ...DEFAULT_AUDIO_PREFERENCES });
  const [language, setLanguage] = useState<Language>('portuguese');

  useEffect(() => {
    const onLanguage = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguage);
    const audio = createAudioManager();
    audioRef.current = audio;
    window.cidadeAudio = audio;
    const frame = window.requestAnimationFrame(() => {
      setLanguage(getStoredLanguage(window.localStorage));
      setAudioPreferences({ ...audio.getPreferences() });
    });
    const startAudio = () => audio.start();
    window.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });
    void import('@/src/game/main');

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguage);
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

  function changeVolume(channel: 'music' | 'ambience', event: ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    audioRef.current?.start();
    if (channel === 'music') audioRef.current?.setMusicVolume(value);
    else audioRef.current?.setAmbienceVolume(value);
    setAudioPreferences((current) => channel === 'music'
      ? { ...current, musicVolume: value }
      : { ...current, ambienceVolume: value });
  }

  return (
    <main id="app">
      <GameUi />
      <header className="barra-superior">
        <BrandWordmark variant="header" />
        <div className="seletor-idioma" role="group" aria-label={uiText(language, 'language_label')}>
          {(['portuguese', 'english'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={language === option} onClick={() => setPlayerLanguage(option)}>
              {uiText(language, option)}
            </button>
          ))}
        </div>
        <div className="audio-menu">
          <button className="audio-toggle" type="button" aria-expanded={audioMenuOpen} aria-controls="audio-controles" onClick={() => setAudioMenuOpen((open) => !open)}>
            <span aria-hidden="true">♪</span> {uiText(language, audioPreferences.muted ? 'audio_off' : 'audio')}
          </button>
          {audioMenuOpen ? (
            <section className="audio-painel" id="audio-controles">
              <button className="audio-master" type="button" aria-pressed={audioPreferences.muted} onClick={toggleAudio}>
                {uiText(language, audioPreferences.muted ? 'unmute' : 'mute')}
              </button>
              <label className="audio-controle"><span>{uiText(language, 'music')} <output>{Math.round(audioPreferences.musicVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={audioPreferences.musicVolume} onChange={(event) => changeVolume('music', event)} /></label>
              <label className="audio-controle"><span>{uiText(language, 'ambience')} <output>{Math.round(audioPreferences.ambienceVolume * 100)}%</output></span><input type="range" min="0" max="1" step="0.01" value={audioPreferences.ambienceVolume} onChange={(event) => changeVolume('ambience', event)} /></label>
            </section>
          ) : null}
        </div>
      </header>
    </main>
  );
}
