import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cidade } from './cidade';
import { mostrarEntrada } from './entrada';
import { RealtimeVoice } from './realtime';
type Escolha = {
  id: string;
  rotulo: string;
  resultado: string;
  satisfacao: number;
  recursos: number;
  moradores: number;
};

type Missao = {
  titulo: string;
  personagem: string;
  pergunta: string;
  escolhas: [Escolha, Escolha];
};

const MISSOES: Missao[] = [
  {
    titulo: 'A Nova Escola',
    personagem: 'Prefeito',
    pergunta: 'Converse com o Prefeito e oriente a construção até a escola atender às crianças do bairro.',
    escolhas: [
      { id: 'escola-compacta', rotulo: 'Escola compacta no centro', resultado: 'O prédio aproveita a infraestrutura central e abre vagas rapidamente.', satisfacao: 3, recursos: -420_000, moradores: 120 },
      { id: 'escola-patio', rotulo: 'Escola com pátio no bairro', resultado: 'O pátio cria espaço para esporte e aproxima a escola das famílias.', satisfacao: 6, recursos: -540_000, moradores: 180 },
    ],
  },
];

const canvas = document.querySelector<HTMLCanvasElement>('#cidade')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x9edbea);
cena.fog = new THREE.Fog(0x9edbea, 42, 86);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 160);
camera.position.set(24, 18, 29);
const controles = new OrbitControls(camera, renderer.domElement);
controles.target.set(0, 1.1, 0);
controles.enableDamping = true;
controles.dampingFactor = 0.065;
controles.minDistance = 11;
controles.maxDistance = 48;
controles.minPolarAngle = 0.35;
controles.maxPolarAngle = Math.PI / 2.08;
controles.enablePan = true;
controles.screenSpacePanning = true;
controles.update();

const cidade = new Cidade();
cena.add(cidade.grupo);
const voz = new RealtimeVoice();

const ui = {
  indice: document.querySelector<HTMLElement>('#missao-indice')!,
  tempo: document.querySelector<HTMLElement>('#tempo-jogo')!,
  titulo: document.querySelector<HTMLElement>('#missao-titulo')!,
  personagem: document.querySelector<HTMLElement>('#personagem')!,
  pergunta: document.querySelector<HTMLElement>('#pergunta')!,
  escolhas: document.querySelector<HTMLElement>('#escolhas')!,
  resultado: document.querySelector<HTMLElement>('#resultado')!,
  resultadoTexto: document.querySelector<HTMLElement>('#resultado-texto')!,
  impactos: document.querySelector<HTMLElement>('#impactos')!,
  proximo: document.querySelector<HTMLButtonElement>('#proximo')!,
  barra: document.querySelector<HTMLElement>('#progresso-barra')!,
  fase: document.querySelector<HTMLElement>('#fase')!,
  percentual: document.querySelector<HTMLElement>('#percentual')!,
  missoesConcluidas: document.querySelector<HTMLElement>('#missoes-concluidas')!,
  conceitoAtual: document.querySelector<HTMLElement>('#conceito-atual')!,
  aprendizados: document.querySelector<HTMLElement>('#aprendizados')!,
  relogio: document.querySelector<HTMLElement>('#relogio')!,
  aviso: document.querySelector<HTMLElement>('#aviso')!,
  guiaPrompt: document.querySelector<HTMLElement>('#guia-prompt')!,
  falaPrefeito: document.querySelector<HTMLElement>('#fala-prefeito')!,
  promptForm: document.querySelector<HTMLElement>('#prompt-form')!,
  promptVoz: document.querySelector<HTMLButtonElement>('#prompt-voz')!,
  promptMutar: document.querySelector<HTMLButtonElement>('#prompt-mutar')!,
  promptStatus: document.querySelector<HTMLElement>('#prompt-status')!,
  promptBlueprint: document.querySelector<HTMLElement>('#prompt-blueprint')!,
  objetivoPrompt: document.querySelector<HTMLElement>('#objetivo-prompt-texto')!,
  alternarOpcoes: document.querySelector<HTMLButtonElement>('#alternar-opcoes')!,
};

let missaoAtual = 0;
let resolvida = false;
let finalizado = false;
let moradores = 8_420;
let satisfacao = 72;
let recursos = 2_400_000;
let segundosJogo = 0;
let avisoTimer = 0;
let jogador = '';
let jogoIniciado = false;
let tentativasPrompt = 0;
const historico: Escolha[] = [];

function formatarRecursos(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor);
}

function atualizarIndicadores() {
  const concluidas = Math.min(MISSOES.length, missaoAtual + (resolvida ? 1 : 0));
  const conceitos = ['Prompt'];
  ui.missoesConcluidas.textContent = `${concluidas} de ${MISSOES.length}`;
  ui.aprendizados.textContent = `${concluidas} de ${MISSOES.length}`;
  ui.conceitoAtual.textContent = conceitos[missaoAtual] ?? 'Cidade transformada';
}

function atualizarProgresso(percentual: number, fase: string) {
  ui.barra.style.width = `${percentual}%`;
  ui.percentual.textContent = `${percentual}%`;
  ui.fase.textContent = fase;
}

function mostrarAviso(texto: string) {
  ui.aviso.textContent = texto;
  ui.aviso.classList.add('visivel');
  window.clearTimeout(avisoTimer);
  avisoTimer = window.setTimeout(() => ui.aviso.classList.remove('visivel'), 2400);
}

function focarMissao(indice = missaoAtual) {
  const enquadramentos = [
    { posicao: [8, 10, 21], alvo: [-8, 1.2, 7] },
    { posicao: [27, 11, 18], alvo: [14, 1, 2] },
    { posicao: [27, 11, 18], alvo: [14, 1, 2] },
    { posicao: [8, 12, 22], alvo: [-8, 2, 7] },
  ];
  const enquadramento = enquadramentos[indice] ?? enquadramentos[0];
  camera.position.fromArray(enquadramento.posicao);
  controles.target.fromArray(enquadramento.alvo);
  controles.update();
  cidade.destacar();
  document.querySelector('#focar-missao')?.classList.add('ativo');
  document.querySelector('#visao-geral')?.classList.remove('ativo');
}

function visaoGeral() {
  camera.position.set(24, 18, 29);
  controles.target.set(0, 1.1, 0);
  controles.update();
  document.querySelector('#visao-geral')?.classList.add('ativo');
  document.querySelector('#focar-missao')?.classList.remove('ativo');
}

function focarEntrada() {
  camera.position.set(10.2, 6.8, 14.65);
  controles.target.set(3.4, 1.25, 4.6);
  controles.enabled = false;
  controles.update();
  cidade.ocultarDestaque();
}

function renderizarMissao() {
  const missao = MISSOES[missaoAtual];
  const missaoComVoz = true;
  finalizado = false;
  resolvida = false;
  cidade.prepararMissao(missaoAtual);
  ui.indice.textContent = `Missão ${missaoAtual + 1} de ${MISSOES.length}`;
  ui.titulo.textContent = missao.titulo;
  ui.personagem.textContent = missao.personagem;
  ui.pergunta.textContent = missao.pergunta;
  atualizarIndicadores();
  ui.escolhas.replaceChildren();
  ui.guiaPrompt.classList.toggle('oculto', !missaoComVoz);
  ui.escolhas.classList.toggle('oculto', missaoComVoz);
  ui.resultado.classList.add('oculto');
  atualizarProgresso(Math.round((missaoAtual / MISSOES.length) * 100), missao.titulo);

  if (missaoComVoz) {
    tentativasPrompt = 0;
    ui.promptForm.classList.remove('oculto');
    ui.promptBlueprint.classList.add('oculto');
    ui.objetivoPrompt.textContent = 'Construa uma escola com um prompt';
    ui.falaPrefeito.textContent = 'Vamos construir uma escola juntos. Conte o que você imagina e observe como cada detalhe muda o projeto.';
    ui.promptStatus.textContent = voz.isMuted()
      ? 'Microfone desligado. Toque em Ativar para falar.'
      : 'Converse naturalmente; a cidade muda enquanto vocês definem a escola.';
    sincronizarMute();
    ui.alternarOpcoes.textContent = 'Prefiro escolher uma opção';
    document.querySelectorAll<HTMLElement>('[data-prompt-etapa]').forEach((etapa, indice) => etapa.classList.toggle('ativa', indice === 0));
    document.querySelectorAll<HTMLElement>('[data-blueprint]').forEach((item) => item.classList.remove('presente'));
  }

  const escolhasDisponiveis = missaoComVoz ? [missao.escolhas[1]] : missao.escolhas;
  for (const escolha of escolhasDisponiveis) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = missaoComVoz ? 'Usar a resposta sugerida' : escolha.rotulo;
    botao.dataset.escolha = escolha.id;
    botao.addEventListener('click', () => escolher(escolha.id));
    ui.escolhas.append(botao);
  }

  focarMissao();
}

function marcarEtapaPrompt(indiceAtivo: number) {
  document.querySelectorAll<HTMLElement>('[data-prompt-etapa]').forEach((etapa, indice) => {
    etapa.classList.toggle('ativa', indice === indiceAtivo);
    etapa.classList.toggle('concluida', indice < indiceAtivo);
  });
}

function marcarBlueprintCompleto() {
  ui.promptBlueprint.classList.remove('oculto');
  document.querySelectorAll<HTMLElement>('[data-blueprint]').forEach((item) => item.classList.add('presente'));
}

function executarAcaoVoz(nome: string, argumentos: Record<string, unknown>) {
  if (nome !== 'atualizar_escola' || missaoAtual !== 0) {
    return { ok: false, motivo: 'ação fora da missão atual' };
  }

  tentativasPrompt += 1;
  const completar = argumentos.etapa === 'completa' || tentativasPrompt >= 2;
  if (!completar) {
    cidade.aplicarEscolha('escola-compacta');
    marcarEtapaPrompt(1);
    atualizarProgresso(12, 'Observando a primeira construção');
    return {
      ok: true,
      visual: 'escola pequena construída',
      fala: 'Diga que a escola ficou pequena. Na próxima fala do jogador, chame imediatamente atualizar_escola com etapa "completa". Sem perguntas.',
    };
  }

  marcarEtapaPrompt(2);
  marcarBlueprintCompleto();
  escolher('escola-patio');
  return {
    ok: true,
    visual: 'escola completa construída',
    missaoConcluida: true,
    fala: 'Parabenize em uma frase e encerre. Não faça perguntas.',
  };
}

function escolher(id: string) {
  if (resolvida || finalizado) return false;
  const missao = MISSOES[missaoAtual];
  const escolha = missao.escolhas.find((item) => item.id === id);
  if (!escolha) return false;

  resolvida = true;
  historico.push(escolha);
  moradores += escolha.moradores;
  satisfacao = Math.min(100, satisfacao + escolha.satisfacao);
  recursos += escolha.recursos;
  cidade.aplicarEscolha(escolha.id);
  atualizarIndicadores();
  atualizarProgresso(Math.round(((missaoAtual + 1) / MISSOES.length) * 100), 'Decisão aplicada');
  ui.escolhas.classList.add('oculto');
  if (missaoAtual === 0) ui.promptForm.classList.add('oculto');
  ui.resultado.classList.remove('oculto');
  ui.resultadoTexto.textContent = escolha.resultado;
  ui.impactos.replaceChildren(
    criarImpacto(`+${escolha.satisfacao}% satisfação`),
    criarImpacto(`${escolha.recursos < 0 ? '−' : '+'} ${formatarRecursos(Math.abs(escolha.recursos))}`),
  );
  ui.proximo.textContent = missaoAtual === MISSOES.length - 1 ? 'Ver cidade transformada' : 'Próxima missão';
  mostrarAviso('A cidade mudou com a sua decisão');
  focarMissao();
  return true;
}

function criarImpacto(texto: string) {
  const impacto = document.createElement('span');
  impacto.textContent = texto;
  return impacto;
}

function avancarMissao() {
  if (!resolvida || finalizado) return false;
  if (missaoAtual < MISSOES.length - 1) {
    missaoAtual += 1;
    renderizarMissao();
  } else {
    renderizarFinal();
  }
  return true;
}

function renderizarFinal() {
  finalizado = true;
  resolvida = false;
  ui.indice.textContent = 'Cidade transformada';
  ui.titulo.textContent = 'Uma cidade que aprende';
  ui.personagem.textContent = 'Resultado da gestão';
  ui.pergunta.textContent = 'A escola abriu, o bairro evoluiu e cada escolha deixou uma marca visível na cidade.';
  ui.escolhas.classList.add('oculto');
  ui.guiaPrompt.classList.add('oculto');
  ui.resultado.classList.remove('oculto');
  ui.resultadoTexto.textContent = historico.map((item) => item.rotulo).join(' · ');
  ui.impactos.replaceChildren(
    criarImpacto(`${new Intl.NumberFormat('pt-BR').format(moradores)} moradores`),
    criarImpacto(`${satisfacao}% de satisfação`),
  );
  ui.proximo.textContent = 'Jogar novamente';
  atualizarProgresso(100, 'Escola concluída');
  visaoGeral();
}

function reiniciarJogo() {
  missaoAtual = 0;
  resolvida = false;
  finalizado = false;
  moradores = 8_420;
  satisfacao = 72;
  recursos = 2_400_000;
  segundosJogo = 0;
  historico.splice(0);
  cidade.reiniciar();
  atualizarIndicadores();
  renderizarMissao();
  voz.startMission(0);
}

ui.proximo.addEventListener('click', () => finalizado ? reiniciarJogo() : avancarMissao());
ui.alternarOpcoes.addEventListener('click', () => {
  const vaiMostrar = ui.escolhas.classList.contains('oculto');
  ui.escolhas.classList.toggle('oculto', !vaiMostrar);
  ui.alternarOpcoes.textContent = vaiMostrar ? 'Continuar falando com o Prefeito' : 'Prefiro escolher uma opção';
});
function sincronizarMute(mutado = voz.isMuted()) {
  ui.promptMutar.setAttribute('aria-pressed', String(mutado));
  ui.promptMutar.setAttribute('aria-label', mutado ? 'Ativar microfone' : 'Desativar microfone');
  ui.promptMutar.classList.toggle('mutado', mutado);
  ui.promptMutar.querySelector('b')!.textContent = mutado ? 'Ativar' : 'Mutar';
  ui.promptStatus.textContent = mutado
    ? 'Microfone desligado. Toque em Ativar para falar.'
    : 'Pode falar; a cidade muda enquanto vocês definem a escola.';
}

function audioCidade() {
  return window.cidadeAudio;
}

let vozAtiva = false;
function marcarVoz(ativa: boolean) {
  if (ativa === vozAtiva) return;
  vozAtiva = ativa;
  if (ativa) audioCidade()?.beginVoice();
  else audioCidade()?.endVoice();
}

ui.promptMutar.addEventListener('click', () => {
  sincronizarMute(voz.toggleMute());
});
ui.promptVoz.addEventListener('click', () => {
  const pausada = voz.togglePause();
  ui.promptVoz.classList.toggle('pausada', pausada);
  ui.promptVoz.querySelector('b')!.textContent = pausada ? 'Continuar conversa' : 'Pausar conversa';
});
document.querySelector('#visao-geral')!.addEventListener('click', visaoGeral);
document.querySelector('#focar-missao')!.addEventListener('click', () => focarMissao());

const raycaster = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
function sobreProjeto(evento: PointerEvent) {
  ponteiro.x = (evento.clientX / innerWidth) * 2 - 1;
  ponteiro.y = -(evento.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(ponteiro, camera);
  return raycaster.intersectObjects(cidade.alvosProjeto, true).length > 0;
}
canvas.addEventListener('pointermove', (evento) => { canvas.style.cursor = sobreProjeto(evento) ? 'pointer' : 'grab'; });
canvas.addEventListener('click', (evento) => { if (sobreProjeto(evento)) focarMissao(); });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

let minutosCidade = 9 * 60;
let ultimoSegundo = -1;
const clock = new THREE.Clock();
function animar() {
  requestAnimationFrame(animar);
  const dt = Math.min(clock.getDelta(), 0.05);
  cidade.atualizar(dt);
  controles.update();
  if (jogoIniciado) segundosJogo += dt;
  minutosCidade += dt * 2.2;
  const segundo = Math.floor(segundosJogo);
  if (segundo !== ultimoSegundo) {
    ultimoSegundo = segundo;
    ui.tempo.textContent = `${String(Math.floor(segundo / 60)).padStart(2, '0')}:${String(segundo % 60).padStart(2, '0')}`;
    const horas = Math.floor(minutosCidade / 60) % 24;
    const minutos = Math.floor(minutosCidade % 60);
    ui.relogio.textContent = `Dia 1 · ${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }
  renderer.render(cena, camera);
}

async function iniciar() {
  try {
    await cidade.construir();
    atualizarIndicadores();
    focarEntrada();
    document.querySelector('#carregando')!.classList.add('oculto');
    animar();
    jogador = await mostrarEntrada();
    jogoIniciado = true;
    controles.enabled = true;
    controles.enableRotate = true;
    controles.enableZoom = true;
    controles.enablePan = true;
    renderizarMissao();
    sincronizarMute();
    void voz.connect(jogador, {
      onState: (estado) => {
        document.querySelector('.fala-prefeito')?.classList.toggle('falando', estado === 'speaking');
        marcarVoz(estado === 'speaking');
        if (estado === 'connecting') ui.promptVoz.querySelector('b')!.textContent = 'Conectando conversa';
        if (estado === 'listening' || estado === 'speaking') ui.promptVoz.querySelector('b')!.textContent = 'Pausar conversa';
        if (estado === 'paused') ui.promptVoz.querySelector('b')!.textContent = 'Continuar conversa';
        if (estado === 'error') ui.promptVoz.querySelector('b')!.textContent = 'Iniciar conversa';
      },
      onMayorText: (texto) => { ui.falaPrefeito.textContent = texto; },
      onAction: executarAcaoVoz,
    });
  } catch (erro) {
    document.querySelector('#carregando')!.textContent = 'Não foi possível carregar a cidade.';
    console.error(erro);
  }
}

(window as unknown as { cidadeViva: unknown }).cidadeViva = {
  estado: () => ({ jogador, missao: missaoAtual + 1, resolvida, finalizado, moradores, satisfacao, recursos, ...cidade.estado() }),
  escolher,
  acaoVoz: executarAcaoVoz,
  avancarMissao,
  reiniciar: reiniciarJogo,
  focarMissao,
  visaoGeral,
};

void iniciar();
