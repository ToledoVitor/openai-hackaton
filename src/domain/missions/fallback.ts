import type {
  EvaluateMissionRequest,
  Language,
  MissionExtraction,
} from "../mission-contracts";
import { getMissionDefinition } from "./mission-registry";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function containsAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function selectedTerms(
  language: Language,
  portuguese: readonly string[],
  english: readonly string[],
): readonly string[] {
  return language === "portuguese" ? portuguese : english;
}

function selectChoice(
  text: string,
  choices: Readonly<Record<string, readonly string[]>>,
): string | null {
  const matches = Object.entries(choices)
    .filter(([, terms]) => containsAny(text, terms))
    .map(([choice]) => choice);
  return matches.length === 1 ? matches[0] ?? null : null;
}

export function fallbackMissionExtraction(request: EvaluateMissionRequest): MissionExtraction {
  const text = normalize(request.prompt);
  const language = request.language;
  const words = (pt: readonly string[], en: readonly string[]) =>
    selectedTerms(language, pt, en);
  const definition = getMissionDefinition(request.missionId);
  const met = new Set<string>();
  let choice: string | null = null;

  if (request.missionId === "new_school") {
    choice = selectChoice(text, {
      compact_center: words(["compacta", "centro"], ["compact", "downtown"]),
      yard_neighborhood: words(["patio", "bairro"], ["yard", "neighborhood"]),
    });
    if (containsAny(text, words(["escola"], ["school"]))) met.add("school_goal_clear");
    if (choice) met.add("school_branch_selected");
    if (containsAny(text, words(["centro", "bairro", "comunidade", "alunos"], ["downtown", "neighborhood", "community", "students"]))) met.add("school_context_clear");
    if (/\b\d+\b/.test(text) || containsAny(text, words(["salas", "capacidade", "alunos"], ["classrooms", "capacity", "students", "square meters"]))) met.add("school_scale_defined");
    if (containsAny(text, words(["acessivel", "rampa", "cadeira de rodas"], ["accessible", "wheelchair", "step-free"]))) met.add("school_accessible");
    if (
      (choice === "compact_center" && containsAny(text, words(["compacta", "pouco espaco"], ["compact", "small footprint"]))) ||
      (choice === "yard_neighborhood" && containsAny(text, words(["patio"], ["yard", "playground"])))
    ) met.add("school_branch_feature_defined");
  }

  if (request.missionId === "safe_path") {
    choice = selectChoice(text, {
      smart_signals: words(["semaforo", "sinal inteligente"], ["smart signal", "traffic light"]),
      calm_green_street: words(["rua calma", "arborizada"], ["tree-lined", "calm street"]),
    });
    if (containsAny(text, words(["caminho seguro", "rota segura"], ["safe path", "safe route"]))) met.add("safe_path_goal_clear");
    if (containsAny(text, words(["crianca", "aluno"], ["children", "child", "students"]))) met.add("child_users_named");
    if (choice) met.add("path_branch_selected");
    if (containsAny(text, words(["por exemplo", "quando"], ["example", "for instance", "when"]))) met.add("concrete_example_included");
    if (containsAny(text, words(["segundos", "velocidade", "medir"], ["seconds", "speed", "measure"]))) met.add("safety_criteria_defined");
    if (containsAny(text, words(["rampa", "piso tatil", "tempo de travessia"], ["curb ramp", "tactile", "crossing time"]))) met.add("accessible_crossing_defined");
    if (
      (choice === "smart_signals" && containsAny(text, words(["temporizacao", "sensor"], ["timing", "sensor"]))) ||
      (choice === "calm_green_street" && containsAny(text, words(["arvore", "velocidade"], ["tree", "speed"])))
    ) met.add("path_branch_requirements_defined");
  }

  if (request.missionId === "unexpected_event") {
    const water = containsAny(text, words(["agua", "abastecimento"], ["water", "supply"]));
    const garbage = containsAny(text, words(["lixo", "coleta"], ["garbage", "trash", "collection"]));
    choice = selectChoice(text, {
      water_first: words(["agua primeiro", "priorizar agua"], ["water first", "prioritize water"]),
      garbage_first: words(["lixo primeiro", "priorizar lixo"], ["garbage first", "trash first"]),
    });
    if (water && garbage) met.add("both_service_problems_identified");
    if (choice) met.add("service_priority_selected");
    if (containsAny(text, words(["porque", "pois", "risco", "saude"], ["because", "reason", "health", "risk"]))) met.add("priority_reasoned");
    const first = language === "portuguese" ? /\b(1|primeiro)[).,: -]/ : /\b(1|first)[).,: -]/;
    const second = language === "portuguese" ? /\b(2|depois)[).,: -]/ : /\b(2|second|then)[).,: -]/;
    if (first.test(text) && second.test(text)) met.add("ordered_steps_defined");
    if (water && garbage && containsAny(text, words(["depois", "em seguida", "tambem"], ["then", "next", "also"]))) met.add("secondary_service_preserved");
    if (containsAny(text, words(["revisar", "verificar", "monitorar"], ["check", "review", "verify", "monitor"]))) met.add("review_step_defined");
  }

  if (request.missionId === "city_school") {
    choice = selectChoice(text, {
      ai_lab: words(["laboratorio de ia", "laboratorio de inteligencia artificial"], ["ai lab"]),
      reading_plaza: words(["biblioteca", "praca de leitura"], ["reading plaza", "library"]),
    });
    if (choice) met.add("city_school_project_selected");
    if (containsAny(text, words(["criatividade", "variedade", "previsibilidade", "precisao"], ["creative", "variety", "predictable", "precision", "consistent"]))) met.add("expected_behavior_explained");
    if (containsAny(text, words(["alunos", "espaco", "capacidade", "seguranca"], ["students", "space", "capacity", "safety"]))) met.add("project_constraints_defined");
  }

  return {
    offTopic: false,
    choice,
    criteria: Object.fromEntries(
      definition.criteria.map((criterion) => [
        criterion,
        { met: met.has(criterion), evidence: met.has(criterion) ? "fallback_match" : "" },
      ]),
    ),
  };
}
