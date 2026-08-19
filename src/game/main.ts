import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cidade } from './cidade';
import { mostrarEntrada } from './entrada';
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
    personagem: 'Prefeito AI',
    pergunta: 'A cidade cresceu e precisa de uma escola pública; qual projeto atende melhor o bairro?',
    escolhas: [
      { id: 'escola-compacta', rotulo: 'Escola compacta no centro', resultado: 'O prédio aproveita a infraestrutura central e abre vagas rapidamente.', satisfacao: 3, recursos: -420_000, moradores: 120 },
      { id: 'escola-patio', rotulo: 'Escola com pátio no bairro', resultado: 'O pátio cria espaço para esporte e aproxima a escola das famílias.', satisfacao: 6, recursos: -540_000, moradores: 180 },
    ],
  },
  {
    titulo: 'Caminho Seguro',
    personagem: 'Engenheira Bia',
    pergunta: 'O trânsito passa na porta da escola; como proteger os estudantes na chegada?',
    escolhas: [
      { id: 'semaforo', rotulo: 'Instalar semáforos inteligentes', resultado: 'Os cruzamentos agora organizam carros e pedestres nos horários de entrada.', satisfacao: 5, recursos: -90_000, moradores: 25 },
      { id: 'rua-calma', rotulo: 'Criar uma rua calma e arborizada', resultado: 'Bancos e áreas verdes reduzem a velocidade e tornam o caminho mais acolhedor.', satisfacao: 4, recursos: -60_000, moradores: 40 },
    ],
  },
  {
    titulo: 'O Imprevisto',
    personagem: 'Agente Rui',
    pergunta: 'A obra revelou baixa pressão de água e o lixo se acumulou; qual problema vem primeiro?',
    escolhas: [
      { id: 'agua', rotulo: 'Garantir o abastecimento de água', resultado: 'Uma nova torre estabiliza o abastecimento da escola e das casas próximas.', satisfacao: 3, recursos: -110_000, moradores: 55 },
      { id: 'limpeza', rotulo: 'Organizar a coleta do bairro', resultado: 'O entorno fica limpo e ganha um ponto permanente de coleta organizada.', satisfacao: 5, recursos: -70_000, moradores: 30 },
    ],
  },
  {
    titulo: 'A Escola da Cidade',
    personagem: 'Educadora Nina',
    pergunta: 'A escola está pronta; qual espaço deve aproximar educação, comunidade e futuro?',
    escolhas: [
      { id: 'laboratorio', rotulo: 'Laboratório de inteligência artificial', resultado: 'O laboratório conecta estudantes a projetos de tecnologia para a cidade.', satisfacao: 6, recursos: -180_000, moradores: 60 },
      { id: 'biblioteca', rotulo: 'Biblioteca e praça de leitura', resultado: 'A escola vira ponto de encontro para estudantes, famílias e moradores.', satisfacao: 7, recursos: -120_000, moradores: 90 },
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
let jogoIniciado = false;
const historico: Escolha[] = [];

function formatarRecursos(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor);
}

function atualizarIndicadores() {
  ui.moradores.textContent = new Intl.NumberFormat('pt-BR').format(moradores);
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
  ui.indice.textContent = `Missão ${missaoAtual + 1} de ${MISSOES.length}`;
  ui.titulo.textContent = missao.titulo;
  ui.personagem.textContent = missao.personagem;
  ui.pergunta.textContent = missao.pergunta;
  ui.escolhas.replaceChildren();
  ui.escolhas.classList.remove('oculto');
  ui.resultado.classList.add('oculto');
  atualizarProgresso(Math.round((missaoAtual / MISSOES.length) * 100), missao.titulo);

  for (const escolha of missao.escolhas) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = escolha.rotulo;
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
  atualizarProgresso(Math.round(((missaoAtual + 1) / MISSOES.length) * 100), 'Decisão aplicada');
  ui.escolhas.classList.add('oculto');
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
  ui.resultado.classList.remove('oculto');
  ui.resultadoTexto.textContent = historico.map((item) => item.rotulo).join(' · ');
  ui.impactos.replaceChildren(
    criarImpacto(`${new Intl.NumberFormat('pt-BR').format(moradores)} moradores`),
    criarImpacto(`${satisfacao}% de satisfação`),
  );
  ui.proximo.textContent = 'Jogar novamente';
  atualizarProgresso(100, 'Quatro missões concluídas');
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
    renderizarMissao();
  } catch (erro) {
    document.querySelector('#carregando')!.textContent = 'Não foi possível carregar a cidade.';
    console.error(erro);
  }
}

(window as unknown as { cidadeViva: unknown }).cidadeViva = {
  estado: () => ({ jogador, missao: missaoAtual + 1, resolvida, finalizado, moradores, satisfacao, recursos, ...cidade.estado() }),
  escolher,
  avancarMissao,
  reiniciar: reiniciarJogo,
  focarMissao,
  visaoGeral,
};

void iniciar();
