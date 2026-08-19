import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cidade } from './cidade';
import { mostrarEntrada } from './entrada';
import type { Language } from '../domain/mission-contracts';

type LocalizedText = Record<Language, string>;
type Escolha = {
  id: string;
  rotulo: LocalizedText;
  resultado: LocalizedText;
  satisfacao: number;
  recursos: number;
  moradores: number;
};

type Missao = {
  titulo: LocalizedText;
  personagem: LocalizedText;
  pergunta: LocalizedText;
  escolhas: [Escolha, Escolha];
};

const MISSOES: Missao[] = [
  {
    titulo: { portuguese: 'A Nova Escola', english: 'The New School' },
    personagem: { portuguese: 'Prefeito AI', english: 'AI Mayor' },
    pergunta: {
      portuguese: 'A cidade cresceu e precisa de uma escola pública; qual projeto atende melhor o bairro?',
      english: 'The city has grown and needs a public school; which project best serves the neighborhood?',
    },
    escolhas: [
      {
        id: 'escola-compacta',
        rotulo: { portuguese: 'Escola compacta no centro', english: 'Compact downtown school' },
        resultado: {
          portuguese: 'O prédio aproveita a infraestrutura central e abre vagas rapidamente.',
          english: 'The building uses downtown infrastructure and opens student places quickly.',
        },
        satisfacao: 3, recursos: -420_000, moradores: 120,
      },
      {
        id: 'escola-patio',
        rotulo: { portuguese: 'Escola com pátio no bairro', english: 'Neighborhood school with a yard' },
        resultado: {
          portuguese: 'O pátio cria espaço para esporte e aproxima a escola das famílias.',
          english: 'The yard creates space for sports and brings the school closer to families.',
        },
        satisfacao: 6, recursos: -540_000, moradores: 180,
      },
    ],
  },
  {
    titulo: { portuguese: 'Caminho Seguro', english: 'Safe Path' },
    personagem: { portuguese: 'Engenheira Bia', english: 'Engineer Bia' },
    pergunta: {
      portuguese: 'O trânsito passa na porta da escola; como proteger os estudantes na chegada?',
      english: 'Traffic passes the school entrance; how should students be protected on arrival?',
    },
    escolhas: [
      {
        id: 'semaforo',
        rotulo: { portuguese: 'Instalar semáforos inteligentes', english: 'Install smart traffic lights' },
        resultado: {
          portuguese: 'Os cruzamentos agora organizam carros e pedestres nos horários de entrada.',
          english: 'Crossings now organize cars and pedestrians during school arrival times.',
        },
        satisfacao: 5, recursos: -90_000, moradores: 25,
      },
      {
        id: 'rua-calma',
        rotulo: { portuguese: 'Criar uma rua calma e arborizada', english: 'Create a calm, tree-lined street' },
        resultado: {
          portuguese: 'Bancos e áreas verdes reduzem a velocidade e tornam o caminho mais acolhedor.',
          english: 'Benches and green areas slow traffic and make the route more welcoming.',
        },
        satisfacao: 4, recursos: -60_000, moradores: 40,
      },
    ],
  },
  {
    titulo: { portuguese: 'O Imprevisto', english: 'The Unexpected Event' },
    personagem: { portuguese: 'Agente Rui', english: 'Agent Rui' },
    pergunta: {
      portuguese: 'A obra revelou baixa pressão de água e o lixo se acumulou; qual problema vem primeiro?',
      english: 'Construction revealed low water pressure while garbage piled up; which problem comes first?',
    },
    escolhas: [
      {
        id: 'agua',
        rotulo: { portuguese: 'Garantir o abastecimento de água', english: 'Secure the water supply' },
        resultado: {
          portuguese: 'Uma nova torre estabiliza o abastecimento da escola e das casas próximas.',
          english: 'A new water tower stabilizes supply for the school and nearby homes.',
        },
        satisfacao: 3, recursos: -110_000, moradores: 55,
      },
      {
        id: 'limpeza',
        rotulo: { portuguese: 'Organizar a coleta do bairro', english: 'Organize neighborhood waste collection' },
        resultado: {
          portuguese: 'O entorno fica limpo e ganha um ponto permanente de coleta organizada.',
          english: 'The area becomes clean and gains a permanent organized collection point.',
        },
        satisfacao: 5, recursos: -70_000, moradores: 30,
      },
    ],
  },
  {
    titulo: { portuguese: 'A Escola da Cidade', english: 'The City School' },
    personagem: { portuguese: 'Educadora Nina', english: 'Educator Nina' },
    pergunta: {
      portuguese: 'A escola está pronta; qual espaço deve aproximar educação, comunidade e futuro?',
      english: 'The school is ready; which space should bring education, community, and the future together?',
    },
    escolhas: [
      {
        id: 'laboratorio',
        rotulo: { portuguese: 'Laboratório de inteligência artificial', english: 'Artificial intelligence lab' },
        resultado: {
          portuguese: 'O laboratório conecta estudantes a projetos de tecnologia para a cidade.',
          english: 'The lab connects students with technology projects for the city.',
        },
        satisfacao: 6, recursos: -180_000, moradores: 60,
      },
      {
        id: 'biblioteca',
        rotulo: { portuguese: 'Biblioteca e praça de leitura', english: 'Library and reading plaza' },
        resultado: {
          portuguese: 'A escola vira ponto de encontro para estudantes, famílias e moradores.',
          english: 'The school becomes a meeting place for students, families, and residents.',
        },
        satisfacao: 7, recursos: -120_000, moradores: 90,
      },
    ],
  },
];

const GAME_COPY = {
  portuguese: {
    mission: 'Missão',
    of: 'de',
    decisionApplied: 'Decisão aplicada',
    satisfactionImpact: 'satisfação',
    transformedCity: 'Ver cidade transformada',
    nextMission: 'Próxima missão',
    changedNotice: 'A cidade mudou com a sua decisão',
    transformed: 'Cidade transformada',
    finalTitle: 'Uma cidade que aprende',
    managementResult: 'Resultado da gestão',
    finalDescription: 'A escola abriu, o bairro evoluiu e cada escolha deixou uma marca visível na cidade.',
    residents: 'moradores',
    satisfaction: 'de satisfação',
    playAgain: 'Jogar novamente',
    completed: 'Quatro missões concluídas',
    day: 'Dia 1',
    loadError: 'Não foi possível carregar a cidade.',
  },
  english: {
    mission: 'Mission',
    of: 'of',
    decisionApplied: 'Decision applied',
    satisfactionImpact: 'satisfaction',
    transformedCity: 'View transformed city',
    nextMission: 'Next mission',
    changedNotice: 'Your decision changed the city',
    transformed: 'Transformed city',
    finalTitle: 'A city that learns',
    managementResult: 'Administration result',
    finalDescription: 'The school opened, the neighborhood evolved, and every choice left a visible mark on the city.',
    residents: 'residents',
    satisfaction: 'satisfaction',
    playAgain: 'Play again',
    completed: 'Four missions completed',
    day: 'Day 1',
    loadError: 'The city could not be loaded.',
  },
} as const satisfies Record<Language, Record<string, string>>;

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
controles.enablePan = false;
controles.update();

const cidade = new Cidade();
cena.add(cidade.grupo);

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
  moradores: document.querySelector<HTMLElement>('#moradores')!,
  satisfacao: document.querySelector<HTMLElement>('#satisfacao')!,
  recursos: document.querySelector<HTMLElement>('#recursos')!,
  relogio: document.querySelector<HTMLElement>('#relogio')!,
  aviso: document.querySelector<HTMLElement>('#aviso')!,
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
let idioma: Language = 'portuguese';
let jogoIniciado = false;
const historico: Escolha[] = [];

function texto(conteudo: LocalizedText) {
  return conteudo[idioma];
}

function formatarRecursos(valor: number) {
  const locale = idioma === 'portuguese' ? 'pt-BR' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor);
}

function atualizarIndicadores() {
  const locale = idioma === 'portuguese' ? 'pt-BR' : 'en-US';
  ui.moradores.textContent = new Intl.NumberFormat(locale).format(moradores);
  ui.satisfacao.textContent = `${satisfacao}%`;
  ui.recursos.textContent = formatarRecursos(recursos);
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
    { posicao: [-5, 9, 16], alvo: [-22, 0.8, 0.5] },
    { posicao: [27, 11, 18], alvo: [14, 1, 2] },
    { posicao: [8, 12, 22], alvo: [-8, 2, 7] },
  ];
  const enquadramento = enquadramentos[indice] ?? enquadramentos[0];
  camera.position.fromArray(enquadramento.posicao);
  controles.target.fromArray(enquadramento.alvo);
  controles.update();
  cidade.destacar();
}

function visaoGeral() {
  camera.position.set(24, 18, 29);
  controles.target.set(0, 1.1, 0);
  controles.update();
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
  finalizado = false;
  resolvida = false;
  cidade.prepararMissao(missaoAtual);
  const copy = GAME_COPY[idioma];
  ui.indice.textContent = `${copy.mission} ${missaoAtual + 1} ${copy.of} ${MISSOES.length}`;
  ui.titulo.textContent = texto(missao.titulo);
  ui.personagem.textContent = texto(missao.personagem);
  ui.pergunta.textContent = texto(missao.pergunta);
  ui.escolhas.replaceChildren();
  ui.escolhas.classList.remove('oculto');
  ui.resultado.classList.add('oculto');
  atualizarProgresso(Math.round((missaoAtual / MISSOES.length) * 100), texto(missao.titulo));

  for (const escolha of missao.escolhas) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = texto(escolha.rotulo);
    botao.dataset.escolha = escolha.id;
    botao.addEventListener('click', () => escolher(escolha.id));
    ui.escolhas.append(botao);
  }

  focarMissao();
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
  const copy = GAME_COPY[idioma];
  atualizarProgresso(Math.round(((missaoAtual + 1) / MISSOES.length) * 100), copy.decisionApplied);
  ui.escolhas.classList.add('oculto');
  ui.resultado.classList.remove('oculto');
  ui.resultadoTexto.textContent = texto(escolha.resultado);
  ui.impactos.replaceChildren(
    criarImpacto(`+${escolha.satisfacao}% ${copy.satisfactionImpact}`),
    criarImpacto(`${escolha.recursos < 0 ? '−' : '+'} ${formatarRecursos(Math.abs(escolha.recursos))}`),
  );
  ui.proximo.textContent = missaoAtual === MISSOES.length - 1 ? copy.transformedCity : copy.nextMission;
  mostrarAviso(copy.changedNotice);
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
  const copy = GAME_COPY[idioma];
  const locale = idioma === 'portuguese' ? 'pt-BR' : 'en-US';
  ui.indice.textContent = copy.transformed;
  ui.titulo.textContent = copy.finalTitle;
  ui.personagem.textContent = copy.managementResult;
  ui.pergunta.textContent = copy.finalDescription;
  ui.escolhas.classList.add('oculto');
  ui.resultado.classList.remove('oculto');
  ui.resultadoTexto.textContent = historico.map((item) => texto(item.rotulo)).join(' · ');
  ui.impactos.replaceChildren(
    criarImpacto(`${new Intl.NumberFormat(locale).format(moradores)} ${copy.residents}`),
    criarImpacto(`${satisfacao}% ${copy.satisfaction}`),
  );
  ui.proximo.textContent = copy.playAgain;
  atualizarProgresso(100, copy.completed);
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
}

ui.proximo.addEventListener('click', () => finalizado ? reiniciarJogo() : avancarMissao());
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
canvas.addEventListener('click', (evento) => { if (sobreProjeto(evento)) focarMissao(0); });

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
    ui.relogio.textContent = `${GAME_COPY[idioma].day} · ${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
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
    const perfil = await mostrarEntrada();
    jogador = perfil.playerName;
    idioma = perfil.language;
    jogoIniciado = true;
    controles.enabled = true;
    atualizarIndicadores();
    renderizarMissao();
  } catch (erro) {
    document.querySelector('#carregando')!.textContent = GAME_COPY[idioma].loadError;
    console.error(erro);
  }
}

(window as unknown as { cidadeViva: unknown }).cidadeViva = {
  estado: () => ({ jogador, language: idioma, missao: missaoAtual + 1, resolvida, finalizado, moradores, satisfacao, recursos, ...cidade.estado() }),
  escolher,
  avancarMissao,
  reiniciar: reiniciarJogo,
  focarMissao,
  visaoGeral,
};

void iniciar();
