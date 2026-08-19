import type { EvaluateMissionRequest, MissionExtraction } from "../mission-contracts";
import { getMissionDefinition } from "./mission-registry";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function selectChoice(text: string, choices: Readonly<Record<string, readonly string[]>>): string | null {
  const matches = Object.entries(choices)
    .filter(([, terms]) => containsAny(text, terms))
    .map(([choice]) => choice);

  return matches.length === 1 ? matches[0] ?? null : null;
}

export function fallbackMissionExtraction(request: EvaluateMissionRequest): MissionExtraction {
  const text = normalize(request.prompt);
  const definition = getMissionDefinition(request.missionId);
  const met = new Set<string>();
  let choice: string | null = null;

  if (request.missionId === "new_school") {
    choice = selectChoice(text, {
      compact_center: ["compact", "centro", "downtown"],
      yard_neighborhood: ["patio", "bairro", "yard", "neighborhood"],
    });
    if (containsAny(text, ["escola", "school"])) met.add("school_goal_clear");
    if (choice) met.add("school_branch_selected");
    if (containsAny(text, ["centro", "bairro", "comunidade", "alunos", "downtown", "neighborhood", "community", "students"])) met.add("school_context_clear");
    if (/\b\d+\b/.test(text) || containsAny(text, ["salas", "capacidade", "grande", "pequena", "classrooms", "capacity", "students", "square meters"])) met.add("school_scale_defined");
    if (containsAny(text, ["acess", "rampa", "cadeira de rodas", "accessible", "wheelchair", "step-free"])) met.add("school_accessible");
    if (
      (choice === "compact_center" && containsAny(text, ["compact", "pouco espaco", "small footprint"])) ||
      (choice === "yard_neighborhood" && containsAny(text, ["patio", "yard", "playground"]))
    ) met.add("school_branch_feature_defined");
  }

  if (request.missionId === "safe_path") {
    choice = selectChoice(text, {
      smart_signals: ["semaforo", "sinal inteligente", "smart signal", "traffic light"],
      calm_green_street: ["rua calma", "arborizada", "tree-lined", "calm street"],
    });
    if (containsAny(text, ["caminho seguro", "rota segura", "safe path", "safe route"])) met.add("safe_path_goal_clear");
    if (containsAny(text, ["crianca", "aluno", "children", "child", "students"])) met.add("child_users_named");
    if (choice) met.add("path_branch_selected");
    if (containsAny(text, ["por exemplo", "quando", "example", "for instance", "when"])) met.add("concrete_example_included");
    if (containsAny(text, ["segundos", "velocidade", "medir", "seconds", "speed", "measure"])) met.add("safety_criteria_defined");
    if (containsAny(text, ["rampa", "piso tatil", "tempo de travessia", "curb ramp", "tactile", "crossing time"])) met.add("accessible_crossing_defined");
    if (
      (choice === "smart_signals" && containsAny(text, ["temporiz", "sensor", "timing"])) ||
      (choice === "calm_green_street" && containsAny(text, ["arvore", "velocidade", "tree", "speed"]))
    ) met.add("path_branch_requirements_defined");
  }

  if (request.missionId === "unexpected_event") {
    const water = containsAny(text, ["agua", "abastecimento", "water", "supply"]);
    const garbage = containsAny(text, ["lixo", "coleta", "garbage", "trash", "collection"]);
    choice = selectChoice(text, {
      water_first: ["agua primeiro", "priorizar agua", "water first", "prioritize water"],
      garbage_first: ["lixo primeiro", "priorizar lixo", "garbage first", "trash first"],
    });
    if (water && garbage) met.add("both_service_problems_identified");
    if (choice) met.add("service_priority_selected");
    if (containsAny(text, ["porque", "pois", "risco", "saude", "because", "reason", "health", "risk"])) met.add("priority_reasoned");
    if (/\b(1|primeiro|first)[).,: -]/.test(text) && /\b(2|depois|second|then)[).,: -]/.test(text)) met.add("ordered_steps_defined");
    if (water && garbage && containsAny(text, ["depois", "em seguida", "tambem", "then", "next", "also"])) met.add("secondary_service_preserved");
    if (containsAny(text, ["revis", "verific", "monitor", "check", "review", "verify"])) met.add("review_step_defined");
  }

  if (request.missionId === "city_school") {
    choice = selectChoice(text, {
      ai_lab: ["laboratorio de ia", "laboratorio de inteligencia artificial", "ai lab"],
      reading_plaza: ["biblioteca", "praca de leitura", "reading plaza", "library"],
    });
    if (choice) met.add("city_school_project_selected");
    met.add("temperature_provided");
    if (containsAny(text, ["criativ", "vari", "previs", "precis", "creative", "variety", "predict", "precision", "consistent"])) met.add("expected_behavior_explained");
    if (containsAny(text, ["alunos", "espaco", "capacidade", "segur", "students", "space", "capacity", "safe"])) met.add("project_constraints_defined");
  }

  return {
    offTopic: met.size === 0,
    choice,
    criteria: Object.fromEntries(
      definition.criteria.map((criterion) => [
        criterion,
        { met: met.has(criterion), evidence: met.has(criterion) ? "fallback_match" : "" },
      ]),
    ),
  };
}
