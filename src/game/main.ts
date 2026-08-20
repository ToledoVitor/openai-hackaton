import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { evaluateMissionOnServer, ClientEvaluationError } from '../client/evaluation-client';
import { getOrCreateInstallationId } from '../client/installation-id';
import { loadJourneyState, saveJourneyState } from '../client/journey-storage';
import { getStoredLanguage, LANGUAGE_CHANGE_EVENT } from '../client/language';
import { uiText } from '../client/ui-copy';
import {
  completeLearningMission,
  createInitialJourneyState,
  getLearningMission,
  getMissionAccess,
  LEARNING_MISSION_IDS,
  localizeMission,
  recommendNextMission,
  selectLearningMission,
  type JourneyState,
  type LearningMissionId,
} from '../domain/learning-journey';
import type { EvaluateMissionResponse, Language } from '../domain/mission-contracts';
import { getNpcDialogue, NPC_IDS, type NpcId } from '../domain/npc-dialogue';
import { Cidade } from './cidade';
import { mostrarEntrada, type PlayerProfile } from './entrada';
import { moveExplorer, movementFromKeys, type ExplorerBounds } from './exploration';
import { RealtimeVoice } from './realtime';
import { MISSION_SCENE_LOCATIONS } from './mission-scene';

const canvas = document.querySelector<HTMLCanvasElement>('#cidade')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const cena = new THREE.Scene();
cena.background = new THREE.Color(0xa8deec);
cena.fog = new THREE.Fog(0xa8deec, 48, 94);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 180);
camera.position.set(24, 18, 29);
const controles = new OrbitControls(camera, renderer.domElement);
controles.target.set(0, 1.1, 0);
controles.enableDamping = true;
controles.dampingFactor = 0.065;
controles.minDistance = 9;
controles.maxDistance = 50;
controles.minPolarAngle = 0.35;
controles.maxPolarAngle = Math.PI / 2.08;
controles.enablePan = true;
controles.screenSpacePanning = true;
controles.update();

const cidade = new Cidade();
cena.add(cidade.grupo);
const voice = new RealtimeVoice();
const installationId = getOrCreateInstallationId(window.localStorage, window.crypto);

const ui = {
  project: document.querySelector<HTMLElement>('.projeto')!,
  missionList: document.querySelector<HTMLElement>('#lista-missoes')!,
  index: document.querySelector<HTMLElement>('#missao-indice')!,
  missionState: document.querySelector<HTMLElement>('#estado-missao')!,
  title: document.querySelector<HTMLElement>('#missao-titulo')!,
  person: document.querySelector<HTMLElement>('#personagem')!,
  concept: document.querySelector<HTMLElement>('#missao-conceito')!,
  objective: document.querySelector<HTMLElement>('#missao-objetivo')!,
  expected: document.querySelector<HTMLElement>('#missao-resultado')!,
  prerequisite: document.querySelector<HTMLElement>('#missao-prerequisito')!,
  briefing: document.querySelector<HTMLElement>('#missao-briefing')!,
  hint: document.querySelector<HTMLElement>('#dica-missao')!,
  form: document.querySelector<HTMLFormElement>('#prompt-form')!,
  prompt: document.querySelector<HTMLTextAreaElement>('#prompt-texto')!,
  submit: document.querySelector<HTMLButtonElement>('#avaliar-plano')!,
  showHint: document.querySelector<HTMLButtonElement>('#mostrar-dica')!,
  voice: document.querySelector<HTMLButtonElement>('#prompt-voz')!,
  voiceHelp: document.querySelector<HTMLElement>('#voz-ajuda')!,
  promptStatus: document.querySelector<HTMLElement>('#prompt-status')!,
  result: document.querySelector<HTMLElement>('#resultado')!,
  resultTitle: document.querySelector<HTMLElement>('#resultado-titulo')!,
  resultText: document.querySelector<HTMLElement>('#resultado-texto')!,
  resultInstruction: document.querySelector<HTMLElement>('#resultado-instrucao')!,
  next: document.querySelector<HTMLButtonElement>('#proximo')!,
  bar: document.querySelector<HTMLElement>('#progresso-barra')!,
  phase: document.querySelector<HTMLElement>('#fase')!,
  percentage: document.querySelector<HTMLElement>('#percentual')!,
  complete: document.querySelector<HTMLElement>('#missoes-concluidas')!,
  recommended: document.querySelector<HTMLElement>('#missao-recomendada')!,
  day: document.querySelector<HTMLElement>('#dia-cidade')!,
  budget: document.querySelector<HTMLElement>('#orcamento-cidade')!,
  health: document.querySelector<HTMLElement>('#bem-estar-cidade')!,
  npcName: document.querySelector<HTMLElement>('#npc-nome')!,
  npcLine: document.querySelector<HTMLElement>('#npc-fala')!,
  npcTabs: document.querySelector<HTMLElement>('#npc-abas')!,
  loading: document.querySelector<HTMLElement>('#carregando')!,
  loadingText: document.querySelector<HTMLElement>('#carregando-texto')!,
  notice: document.querySelector<HTMLElement>('#aviso')!,
  overview: document.querySelector<HTMLButtonElement>('#visao-geral')!,
  focus: document.querySelector<HTMLButtonElement>('#focar-missao')!,
  cameraControls: document.querySelector<HTMLElement>('#controles-camera')!,
};

const labels = {
  '#estado-titulo': 'city_status', '#rotulo-dia': 'day', '#rotulo-orcamento': 'budget',
  '#rotulo-bem-estar': 'city_health', '#rotulo-recomendada': 'recommended_next',
  '#rotulo-conceito': 'mission_concept', '#rotulo-objetivo': 'mission_objective',
  '#rotulo-resultado': 'expected_outcome', '#rotulo-prerequisito': 'prerequisite',
  '#rotulo-briefing': 'briefing', '#rotulo-plano': 'your_plan', '#rotulo-feedback': 'feedback',
  '#rotulo-npc': 'npc_issue', '#ajuda-exploracao': 'explore_help',
} as const;

let language: Language = getStoredLanguage(window.localStorage);
let profile: PlayerProfile = { name: '', language };
let journey: JourneyState = loadJourneyState(window.localStorage);
let activeMissionId: LearningMissionId = journey.activeMissionId ?? LEARNING_MISSION_IDS.at(-1)!;
let selectedNpc: NpcId = 'housing_resident';
let lastResponse: EvaluateMissionResponse | null = null;
let evaluating = false;
let gameStarted = false;
let noticeTimer = 0;
let elapsed = 0;
const attempts = new Map<LearningMissionId, number>();
const criteria = new Map<LearningMissionId, string[]>();
const choices = new Map<LearningMissionId, string>();

const explorerBounds: ExplorerBounds = {
  minX: -35, maxX: 35, minZ: -35, maxZ: 35,
  obstacles: [
    { minX: -18, maxX: -10, minZ: 3, maxZ: 12 },
    { minX: 10, maxX: 18, minZ: -1, maxZ: 7 },
  ],
};
const explorer = new THREE.Vector3(0, 1.1, 0);
const pressedKeys = new Set<string>();

function missionIndex(missionId = activeMissionId) {
  return LEARNING_MISSION_IDS.indexOf(missionId);
}

function updateCityEffects() {
  for (const missionId of journey.completedMissionIds) cidade.aplicarEscolha(missionId);
}

function updateCityState() {
  const completed = journey.completedMissionIds.length;
  const spent = [450_000, 780_000, 160_000].slice(0, completed).reduce((sum, value) => sum + value, 0);
  const budget = 2_400_000 - spent;
  const locale = language === 'portuguese' ? 'pt-BR' : 'en-US';
  ui.complete.textContent = `${completed} / ${LEARNING_MISSION_IDS.length}`;
  ui.day.textContent = String(1 + completed);
  ui.budget.textContent = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(budget);
  ui.health.textContent = `${72 + completed * 8}%`;
  const recommended = recommendNextMission(journey);
  ui.recommended.textContent = recommended
    ? localizeMission(recommended, language).title
    : uiText(language, 'journey_complete');
}

function updateProgress() {
  const completed = journey.completedMissionIds.length;
  const definition = getLearningMission(activeMissionId);
  const missionCriteria = criteria.get(activeMissionId) ?? [];
  const withinMission = getMissionAccess(journey, activeMissionId) === 'completed'
    ? 1
    : missionCriteria.length / definition.criteria.length;
  const percentage = Math.round(((completed + withinMission) / LEARNING_MISSION_IDS.length) * 100);
  ui.bar.style.width = `${percentage}%`;
  ui.percentage.textContent = `${percentage}%`;
  ui.phase.textContent = localizeMission(activeMissionId, language).concept;
}

function renderMissionList() {
  ui.missionList.replaceChildren();
  LEARNING_MISSION_IDS.forEach((missionId, index) => {
    const access = getMissionAccess(journey, missionId);
    const copy = localizeMission(missionId, language);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.missionId = missionId;
    button.classList.toggle('ativo', missionId === activeMissionId);
    button.classList.toggle('concluida', access === 'completed');
    button.disabled = access === 'locked';
    button.textContent = `${index + 1}. ${copy.title}${access === 'locked' ? ' · 🔒' : access === 'completed' ? ' · ✓' : ''}`;
    button.title = access === 'locked' ? uiText(language, 'locked') : copy.objective;
    button.addEventListener('click', () => selectMission(missionId));
    ui.missionList.append(button);
  });
}

function renderNpc(npcId = selectedNpc) {
  selectedNpc = npcId;
  const dialogue = getNpcDialogue(npcId, journey, language);
  ui.npcName.textContent = dialogue.name;
  ui.npcLine.textContent = dialogue.line;
  ui.npcTabs.replaceChildren();
  NPC_IDS.forEach((id, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.toggle('ativo', id === npcId);
    button.setAttribute('aria-label', getNpcDialogue(id, journey, language).name);
    button.textContent = String(index + 1);
    button.addEventListener('click', () => renderNpc(id));
    ui.npcTabs.append(button);
  });
}

function renderLanguage() {
  document.documentElement.lang = language === 'portuguese' ? 'pt-BR' : 'en';
  Object.entries(labels).forEach(([selector, key]) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.textContent = uiText(language, key);
  });
  ui.prompt.placeholder = uiText(language, 'prompt_placeholder');
  canvas.setAttribute('aria-label', uiText(language, 'city_canvas_label'));
  ui.missionList.setAttribute('aria-label', uiText(language, 'mission_navigation_label'));
  ui.cameraControls.setAttribute('aria-label', uiText(language, 'camera_controls_label'));
  ui.submit.textContent = uiText(language, evaluating ? 'evaluating' : 'submit_plan');
  ui.showHint.textContent = uiText(language, 'hint');
  ui.voiceHelp.textContent = uiText(language, 'voice_optional');
  ui.voice.textContent = uiText(language, voice.isConnected() ? 'stop_voice' : 'start_voice');
  ui.overview.textContent = uiText(language, 'camera_overview');
  ui.focus.textContent = uiText(language, 'camera_mission');
  ui.loadingText.textContent = uiText(language, 'loading_city');
  renderMission();
  renderNpc();
}

function renderMission() {
  const copy = localizeMission(activeMissionId, language);
  const definition = getLearningMission(activeMissionId);
  const access = getMissionAccess(journey, activeMissionId);
  ui.index.textContent = `${language === 'portuguese' ? 'Missão' : 'Mission'} ${missionIndex() + 1} / ${LEARNING_MISSION_IDS.length}`;
  ui.missionState.textContent = access === 'completed'
    ? (language === 'portuguese' ? 'Concluída' : 'Complete')
    : access === 'locked' ? uiText(language, 'locked') : (language === 'portuguese' ? 'Disponível' : 'Available');
  ui.title.textContent = copy.title;
  ui.person.textContent = language === 'portuguese' ? `Prefeito ${profile.name || ''}` : `Mayor ${profile.name || ''}`;
  ui.concept.textContent = copy.concept;
  ui.objective.textContent = copy.objective;
  ui.expected.textContent = copy.expectedOutcome;
  ui.prerequisite.textContent = definition.prerequisite
    ? localizeMission(definition.prerequisite, language).title
    : uiText(language, 'no_prerequisite');
  ui.briefing.textContent = copy.briefing;
  ui.hint.textContent = copy.hint;
  ui.hint.classList.add('oculto');
  ui.form.classList.toggle('oculto', access !== 'available');
  ui.result.classList.toggle('oculto', lastResponse === null && access !== 'completed');
  if (access === 'completed' && !lastResponse) {
    ui.resultTitle.textContent = copy.feedback;
    ui.resultText.textContent = copy.expectedOutcome;
    ui.resultInstruction.textContent = copy.nextStep;
    ui.next.classList.add('oculto');
  }
  renderMissionList();
  updateCityState();
  updateProgress();
  cidade.prepararMissao(activeMissionId);
}

function selectMission(missionId: LearningMissionId) {
  const selection = selectLearningMission(journey, missionId);
  if (selection.error) {
    showNotice(uiText(language, selection.error === 'mission_locked' ? 'locked' : 'error_invalid_request'));
    return false;
  }
  journey = selection.state;
  activeMissionId = missionId;
  selectedNpc = NPC_IDS[missionIndex()] ?? NPC_IDS[0];
  lastResponse = null;
  ui.prompt.value = '';
  ui.promptStatus.textContent = '';
  renderMission();
  focusMission();
  return true;
}

function errorMessage(error: unknown) {
  if (!(error instanceof ClientEvaluationError)) return uiText(language, 'error_unknown');
  const keys = {
    invalid_request: 'error_invalid_request', rate_limited: 'error_rate_limited',
    provider_unavailable: 'error_provider_unavailable', invalid_response: 'error_invalid_response',
    network_error: 'error_network', timeout: 'error_timeout',
  } as const;
  return uiText(language, keys[error.code]);
}

async function submitPlan(prompt: string): Promise<EvaluateMissionResponse | { error: string }> {
  if (evaluating || getMissionAccess(journey, activeMissionId) !== 'available') {
    return { error: 'mission_unavailable' };
  }
  evaluating = true;
  ui.submit.disabled = true;
  ui.submit.textContent = uiText(language, 'evaluating');
  ui.promptStatus.textContent = uiText(language, 'evaluating');
  const attempt = (attempts.get(activeMissionId) ?? 0) + 1;
  attempts.set(activeMissionId, attempt);

  try {
    const definition = getLearningMission(activeMissionId);
    const response = await evaluateMissionOnServer({
      missionId: activeMissionId,
      stepId: definition.stepId,
      language,
      prompt,
      attempt,
      satisfiedCriteria: criteria.get(activeMissionId) ?? [],
      ...(choices.has(activeMissionId) ? { selectedChoice: choices.get(activeMissionId)! } : {}),
      safetyIdentifier: installationId,
    });
    lastResponse = response;
    criteria.set(activeMissionId, response.progress.satisfied);
    if (response.choice) choices.set(activeMissionId, response.choice);
    ui.result.classList.remove('oculto');
    ui.resultTitle.textContent = response.feedback.summary;
    ui.resultText.textContent = response.feedback.explanation;
    ui.resultInstruction.textContent = response.feedback.nextInstruction ?? '';
    ui.promptStatus.textContent = response.feedback.summary;
    const success = response.status === 'success';
    ui.next.classList.toggle('oculto', !success);
    ui.next.textContent = recommendNextMission(journey) === null
      ? uiText(language, 'journey_complete') : uiText(language, 'next_mission');

    if (success) {
      const completion = completeLearningMission(journey, activeMissionId, response.status);
      if (!completion.error) {
        journey = completion.state;
        saveJourneyState(window.localStorage, journey);
        cidade.aplicarEscolha(activeMissionId);
        ui.resultText.textContent = `${response.feedback.explanation} ${localizeMission(activeMissionId, language).feedback}`;
        ui.resultInstruction.textContent = localizeMission(activeMissionId, language).nextStep;
        ui.form.classList.add('oculto');
        renderMissionList();
        updateCityState();
        updateProgress();
        renderNpc();
        ui.next.textContent = recommendNextMission(journey) === null
          ? uiText(language, 'journey_complete') : uiText(language, 'next_mission');
      }
    }
    return response;
  } catch (error) {
    const message = errorMessage(error);
    ui.promptStatus.textContent = message;
    ui.result.classList.remove('oculto');
    ui.resultTitle.textContent = uiText(language, 'feedback');
    ui.resultText.textContent = message;
    ui.resultInstruction.textContent = uiText(language, 'retry');
    ui.next.classList.add('oculto');
    return { error: error instanceof ClientEvaluationError ? error.code : 'unknown' };
  } finally {
    evaluating = false;
    ui.submit.disabled = false;
    ui.submit.textContent = uiText(language, 'submit_plan');
  }
}

function advanceMission() {
  const next = recommendNextMission(journey);
  if (next) return selectMission(next);
  lastResponse = null;
  ui.next.classList.add('oculto');
  ui.promptStatus.textContent = uiText(language, 'journey_complete');
  overview();
  renderMission();
  return true;
}

function resetGame() {
  journey = createInitialJourneyState();
  activeMissionId = journey.activeMissionId!;
  attempts.clear();
  criteria.clear();
  choices.clear();
  lastResponse = null;
  saveJourneyState(window.localStorage, journey);
  cidade.reiniciar();
  renderLanguage();
  focusMission();
  return true;
}

function showNotice(message: string) {
  ui.notice.textContent = message;
  ui.notice.classList.add('visivel');
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => ui.notice.classList.remove('visivel'), 2800);
}

function focusMission() {
  const location = MISSION_SCENE_LOCATIONS[activeMissionId];
  camera.position.fromArray(location.cameraPosition);
  controles.target.fromArray(location.cameraTarget);
  explorer.copy(controles.target);
  controles.update();
  cidade.destacar();
  ui.focus.classList.add('ativo');
  ui.overview.classList.remove('ativo');
}

function overview() {
  camera.position.set(24, 18, 29);
  controles.target.set(0, 1.1, 0);
  explorer.copy(controles.target);
  controles.update();
  ui.overview.classList.add('ativo');
  ui.focus.classList.remove('ativo');
}

function focusEntry() {
  camera.position.set(10.2, 6.8, 14.65);
  controles.target.set(3.4, 1.25, 4.6);
  controles.enabled = false;
  controles.update();
  cidade.ocultarDestaque();
}

ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = ui.prompt.value.trim();
  if (prompt) void submitPlan(prompt);
});
ui.showHint.addEventListener('click', () => ui.hint.classList.toggle('oculto'));
ui.next.addEventListener('click', advanceMission);
ui.overview.addEventListener('click', overview);
ui.focus.addEventListener('click', focusMission);
ui.voice.addEventListener('click', () => {
  if (voice.isConnected()) {
    voice.disconnect();
    ui.voice.textContent = uiText(language, 'start_voice');
    return;
  }
  const definition = getLearningMission(activeMissionId);
  void voice.connect(profile.name, {
    missionId: activeMissionId,
    stepId: definition.stepId,
    language,
    attempt: (attempts.get(activeMissionId) ?? 0) + 1,
    satisfiedCriteria: criteria.get(activeMissionId) ?? [],
    ...(choices.has(activeMissionId) ? { selectedChoice: choices.get(activeMissionId)! } : {}),
    safetyIdentifier: installationId,
  }, {
    onState: (state) => {
      if (state === 'speaking') window.cidadeAudio?.beginVoice();
      else window.cidadeAudio?.endVoice();
      ui.voice.textContent = uiText(language, state === 'closed' || state === 'error' ? 'start_voice' : 'stop_voice');
      if (state === 'error') ui.promptStatus.textContent = uiText(language, 'error_provider_unavailable');
    },
    onMayorText: (text) => { ui.promptStatus.textContent = text; },
    onPrompt: async (prompt) => {
      ui.prompt.value = prompt;
      return submitPlan(prompt);
    },
  });
});

window.addEventListener(LANGUAGE_CHANGE_EVENT, (event) => {
  language = (event as CustomEvent<Language>).detail;
  profile.language = language;
  lastResponse = null;
  ui.promptStatus.textContent = '';
  voice.disconnect(false);
  renderLanguage();
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    pressedKeys.add(event.key);
    event.preventDefault();
  }
});
window.addEventListener('keyup', (event) => pressedKeys.delete(event.key));

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener('click', (event) => {
  pointer.x = (event.clientX / innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObjects(cidade.alvosNpc, true).length > 0) {
    renderNpc(NPC_IDS[missionIndex()] ?? NPC_IDS[0]);
    return;
  }
  if (raycaster.intersectObjects(cidade.alvosProjeto, true).length > 0) {
    focusMission();
    return;
  }
  const target = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(ground, target)) {
    const delta = { x: target.x - explorer.x, z: target.z - explorer.z };
    const distance = Math.hypot(delta.x, delta.z);
    if (distance > 0) {
      const next = moveExplorer(explorer, { x: delta.x / distance, z: delta.z / distance }, distance, explorerBounds);
      explorer.set(next.x, 1.1, next.z);
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  ui.project.scrollTop = 0;
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  cidade.atualizar(dt);
  if (gameStarted) elapsed += dt;
  const movement = movementFromKeys(pressedKeys);
  if (movement.x !== 0 || movement.z !== 0) {
    const next = moveExplorer(explorer, movement, dt * 9, explorerBounds);
    explorer.set(next.x, 1.1, next.z);
  }
  if (gameStarted && (pressedKeys.size > 0 || controles.target.distanceTo(explorer) > 0.02)) {
    controles.target.lerp(explorer, Math.min(1, dt * 7));
  }
  controles.update();
  renderer.render(cena, camera);
}

async function start() {
  renderLanguage();
  try {
    await cidade.construir();
    updateCityEffects();
    focusEntry();
    ui.loading.classList.add('oculto');
    animate();
    profile = await mostrarEntrada();
    language = profile.language;
    gameStarted = true;
    controles.enabled = true;
    renderLanguage();
    focusMission();
  } catch {
    ui.loadingText.textContent = uiText(language, 'loading_error');
    ui.loading.classList.add('erro');
  }
}

(window as unknown as { cidadeViva: unknown }).cidadeViva = {
  estado: () => ({
    profile: { name: profile.name, language }, journey, activeMissionId, elapsed,
    explorer: { x: explorer.x, z: explorer.z }, ...cidade.estado(),
  }),
  escolher: (id: LearningMissionId) => selectMission(id),
  avancarMissao: advanceMission,
  reiniciar: resetGame,
  focarMissao: focusMission,
  visaoGeral: overview,
};

void start();
