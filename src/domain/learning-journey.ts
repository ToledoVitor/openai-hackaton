export const LEARNING_MISSION_IDS = [
  "apartment_construction",
  "hospital_construction",
  "urban_repair",
] as const;

export type LearningMissionId = (typeof LEARNING_MISSION_IDS)[number];
export type LearningLanguage = "portuguese" | "english";

export type LocalizedMissionMetadata = {
  title: string;
  concept: string;
  objective: string;
  expectedOutcome: string;
  briefing: string;
  hint: string;
  feedback: string;
  nextStep: string;
};

export type LearningMissionDefinition = {
  id: LearningMissionId;
  prerequisite: LearningMissionId | null;
  stepId: "plan" | "prioritize" | "diagnose";
  paths: readonly string[];
  criteria: readonly string[];
  copy: Readonly<Record<LearningLanguage, LocalizedMissionMetadata>>;
};

export const LEARNING_MISSIONS = [
  {
    id: "apartment_construction",
    prerequisite: null,
    stepId: "plan",
    paths: ["balanced_housing"],
    criteria: [
      "housing_goal_clear",
      "housing_residents_defined",
      "housing_capacity_defined",
      "housing_budget_defined",
      "housing_accessibility_defined",
      "housing_green_space_defined",
    ],
    copy: {
      portuguese: {
        title: "Moradia para o bairro",
        concept: "Prompts claros: objetivo, público, requisitos e limites",
        objective: "Planejar apartamentos que atendam famílias do bairro sem ultrapassar o orçamento.",
        expectedOutcome: "Um conjunto residencial acessível, dimensionado, com área verde e custo definido.",
        briefing: "O aluguel subiu e famílias precisam de moradia perto de transporte e serviços. Oriente a equipe com um pedido verificável.",
        hint: "Diga quem vai morar, quantas unidades serão construídas, orçamento, acessibilidade e área verde.",
        feedback: "Plano habitacional aprovado com requisitos claros e restrições verificáveis.",
        nextStep: "Leve mesma clareza para priorizar serviços essenciais do hospital.",
      },
      english: {
        title: "Housing for the neighborhood",
        concept: "Clear prompts: goal, audience, requirements, and limits",
        objective: "Plan apartments that serve neighborhood families without exceeding budget.",
        expectedOutcome: "An accessible, properly sized housing complex with green space and a defined cost.",
        briefing: "Rents have risen and families need homes near transport and services. Guide the team with a verifiable request.",
        hint: "Name the residents, unit count, budget, accessibility, and green-space requirement.",
        feedback: "Housing plan approved with clear requirements and verifiable constraints.",
        nextStep: "Apply the same clarity when prioritizing essential hospital services.",
      },
    },
  },
  {
    id: "hospital_construction",
    prerequisite: "apartment_construction",
    stepId: "prioritize",
    paths: ["emergency_ready"],
    criteria: [
      "hospital_goal_clear",
      "hospital_service_priority_defined",
      "hospital_emergency_access_defined",
      "hospital_capacity_defined",
      "hospital_safety_constraints_defined",
      "hospital_success_measure_defined",
    ],
    copy: {
      portuguese: {
        title: "Hospital pronto para cuidar",
        concept: "Priorização, segurança e critérios de sucesso",
        objective: "Definir um hospital seguro com atendimento prioritário e acesso rápido a emergências.",
        expectedOutcome: "Hospital com capacidade, fluxo de ambulâncias, serviços prioritários e indicadores de segurança.",
        briefing: "A cidade cresceu mais rápido que a rede de saúde. Priorize o essencial e deixe explícito como o projeto será considerado seguro.",
        hint: "Defina serviço prioritário, capacidade, entrada de ambulâncias, restrições de segurança e medida de sucesso.",
        feedback: "Hospital aprovado com prioridades, segurança e resultado esperado bem definidos.",
        nextStep: "Use diagnóstico e sequência para corrigir problemas urbanos já visíveis.",
      },
      english: {
        title: "A hospital ready to care",
        concept: "Prioritization, safety, and success criteria",
        objective: "Define a safe hospital with priority care and fast emergency access.",
        expectedOutcome: "A hospital with capacity, ambulance flow, priority services, and safety measures.",
        briefing: "The city grew faster than its health network. Prioritize essentials and state how the project will be judged safe.",
        hint: "Define priority service, capacity, ambulance access, safety constraints, and a success measure.",
        feedback: "Hospital approved with clear priorities, safety constraints, and expected result.",
        nextStep: "Use diagnosis and sequencing to fix urban problems already visible in the city.",
      },
    },
  },
  {
    id: "urban_repair",
    prerequisite: "hospital_construction",
    stepId: "diagnose",
    paths: ["mobility_then_sanitation", "sanitation_then_mobility"],
    criteria: [
      "urban_problems_diagnosed",
      "urban_priority_defined",
      "urban_root_causes_explained",
      "urban_corrections_ordered",
      "urban_safety_check_defined",
      "urban_followup_defined",
    ],
    copy: {
      portuguese: {
        title: "Erros urbanos em campo",
        concept: "Diagnóstico, causa, correção e verificação",
        objective: "Diagnosticar travessias inseguras e lixo acumulado, depois ordenar correções seguras.",
        expectedOutcome: "Problemas corrigidos na ordem escolhida, com verificação de segurança e acompanhamento.",
        briefing: "A cidade já mostra dois erros: cruzamento perigoso e resíduos acumulados. Explique causas, prioridade e sequência de correção.",
        hint: "Nomeie os dois problemas, escolha prioridade, explique causas, ordene ações e inclua verificação final.",
        feedback: "Diagnóstico concluído; correções urbanas aplicadas e verificadas.",
        nextStep: "Revise os aprendizados e continue explorando a cidade transformada.",
      },
      english: {
        title: "Urban errors in the field",
        concept: "Diagnosis, cause, correction, and verification",
        objective: "Diagnose unsafe crossings and accumulated waste, then order safe corrections.",
        expectedOutcome: "Problems fixed in chosen order, with a safety check and follow-up.",
        briefing: "Two errors are already visible: a dangerous crossing and accumulated waste. Explain causes, priority, and correction sequence.",
        hint: "Name both problems, choose priority, explain causes, order actions, and include a final check.",
        feedback: "Diagnosis complete; urban corrections applied and verified.",
        nextStep: "Review what you learned and keep exploring the transformed city.",
      },
    },
  },
] as const satisfies readonly LearningMissionDefinition[];

const missionById = Object.fromEntries(
  LEARNING_MISSIONS.map((mission) => [mission.id, mission]),
) as Record<LearningMissionId, (typeof LEARNING_MISSIONS)[number]>;

export type JourneyState = {
  version: 1;
  completedMissionIds: LearningMissionId[];
  activeMissionId: LearningMissionId | null;
};

export type JourneyError =
  | "invalid_mission"
  | "mission_locked"
  | "mission_already_complete"
  | "evaluation_incomplete";

export type JourneyResult = { state: JourneyState; error: JourneyError | null };

export function isLearningMissionId(value: unknown): value is LearningMissionId {
  return typeof value === "string" && LEARNING_MISSION_IDS.includes(value as LearningMissionId);
}

export function createInitialJourneyState(): JourneyState {
  return { version: 1, completedMissionIds: [], activeMissionId: LEARNING_MISSION_IDS[0] };
}

export function recommendNextMission(state: JourneyState): LearningMissionId | null {
  return LEARNING_MISSION_IDS.find((id) => !state.completedMissionIds.includes(id)) ?? null;
}

export function getMissionAccess(
  state: JourneyState,
  missionId: LearningMissionId,
): "available" | "locked" | "completed" {
  if (state.completedMissionIds.includes(missionId)) return "completed";
  const prerequisite = missionById[missionId].prerequisite;
  return prerequisite === null || state.completedMissionIds.includes(prerequisite)
    ? "available"
    : "locked";
}

export function selectLearningMission(state: JourneyState, missionId: unknown): JourneyResult {
  if (!isLearningMissionId(missionId)) return { state, error: "invalid_mission" };
  if (getMissionAccess(state, missionId) === "locked") return { state, error: "mission_locked" };
  return { state: { ...state, activeMissionId: missionId }, error: null };
}

export function completeLearningMission(
  state: JourneyState,
  missionId: unknown,
  evaluationStatus: "redirected" | "retry" | "partial" | "success",
): JourneyResult {
  if (!isLearningMissionId(missionId)) return { state, error: "invalid_mission" };
  const access = getMissionAccess(state, missionId);
  if (access === "locked") return { state, error: "mission_locked" };
  if (access === "completed") return { state, error: "mission_already_complete" };
  if (evaluationStatus !== "success") return { state, error: "evaluation_incomplete" };

  const completedMissionIds = canonicalCompleted([...state.completedMissionIds, missionId]);
  const completedState: JourneyState = { version: 1, completedMissionIds, activeMissionId: null };
  completedState.activeMissionId = recommendNextMission(completedState);
  return { state: completedState, error: null };
}

export function serializeJourneyState(state: JourneyState): string {
  return JSON.stringify(state);
}

export function parseJourneyState(serialized: string | null | undefined): JourneyState {
  if (!serialized) return createInitialJourneyState();
  try {
    const value: unknown = JSON.parse(serialized);
    if (typeof value !== "object" || value === null || !("completedMissionIds" in value)) {
      return createInitialJourneyState();
    }
    const rawCompleted = (value as { completedMissionIds?: unknown }).completedMissionIds;
    if (!Array.isArray(rawCompleted)) return createInitialJourneyState();
    const completedMissionIds = canonicalCompleted(rawCompleted);
    const state: JourneyState = { version: 1, completedMissionIds, activeMissionId: null };
    state.activeMissionId = recommendNextMission(state);
    return state;
  } catch {
    return createInitialJourneyState();
  }
}

export function localizeMission(
  missionId: LearningMissionId,
  language: LearningLanguage,
): LocalizedMissionMetadata;
export function localizeMission(
  missionId: LearningMissionId,
  language: LearningLanguage,
  field: string,
): string;
export function localizeMission(
  missionId: LearningMissionId,
  language: LearningLanguage,
  field?: string,
): LocalizedMissionMetadata | string {
  const copy = missionById[missionId].copy[language] ?? missionById[missionId].copy.portuguese;
  if (field === undefined) return copy;
  const value = copy[field as keyof LocalizedMissionMetadata];
  return typeof value === "string" && value.trim().length > 0 ? value : humanizeIdentifier(field);
}

export function getLearningMission(missionId: LearningMissionId): LearningMissionDefinition {
  return missionById[missionId];
}

function canonicalCompleted(values: readonly unknown[]): LearningMissionId[] {
  const included = new Set(values.filter(isLearningMissionId));
  const completed: LearningMissionId[] = [];
  for (const missionId of LEARNING_MISSION_IDS) {
    if (!included.has(missionId)) break;
    completed.push(missionId);
  }
  return completed;
}

function humanizeIdentifier(value: string): string {
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.length === 0 ? "Missing text" : words[0]!.toUpperCase() + words.slice(1);
}
