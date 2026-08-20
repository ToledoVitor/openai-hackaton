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

  if (request.missionId === "apartment_construction") {
    if (containsAny(text, words(["apartamento", "moradia"], ["apartment", "housing"]))) {
      choice = "balanced_housing";
      met.add("housing_goal_clear");
    }
    if (containsAny(text, words(["familia", "moradores", "vizinhança"], ["families", "residents", "neighborhood"]))) met.add("housing_residents_defined");
    if (/\b\d+\b/.test(text) && containsAny(text, words(["apartamento", "unidade"], ["apartment", "unit"]))) met.add("housing_capacity_defined");
    if (containsAny(text, words(["orcamento", "milhao", "r$"], ["budget", "million", "$"]))) met.add("housing_budget_defined");
    if (containsAny(text, words(["acessivel", "cadeira de rodas", "sem degrau"], ["accessible", "wheelchair", "step-free"]))) met.add("housing_accessibility_defined");
    if (containsAny(text, words(["area verde", "patio verde", "jardim"], ["green courtyard", "green space", "garden"]))) met.add("housing_green_space_defined");
  }

  if (request.missionId === "hospital_construction") {
    if (containsAny(text, words(["hospital"], ["hospital"]))) {
      choice = "emergency_ready";
      met.add("hospital_goal_clear");
    }
    if (containsAny(text, words(["priorize", "pronto atendimento", "emergencia"], ["prioritize", "emergency", "urgent care"]))) met.add("hospital_service_priority_defined");
    if (containsAny(text, words(["ambulancia", "acesso de emergencia"], ["ambulance", "emergency access"]))) met.add("hospital_emergency_access_defined");
    if (/\b\d+\b/.test(text) && containsAny(text, words(["leito", "capacidade"], ["bed", "capacity"]))) met.add("hospital_capacity_defined");
    if (containsAny(text, words(["rota segura", "rotas seguras", "seguranca", "controle de infeccao"], ["safe route", "safety", "infection control"]))) met.add("hospital_safety_constraints_defined");
    if (/\b\d+\b/.test(text) && containsAny(text, words(["meta", "minuto", "medir"], ["target", "minute", "measure"]))) met.add("hospital_success_measure_defined");
  }

  if (request.missionId === "urban_repair") {
    const mobility = containsAny(text, words(["travessia insegura", "semaforo ausente"], ["unsafe crossing", "missing signal"]));
    const sanitation = containsAny(text, words(["lixo acumulado", "coleta atrasada"], ["accumulated waste", "delayed collection"]));
    if (mobility && sanitation) met.add("urban_problems_diagnosed");
    choice = selectChoice(text, {
      mobility_then_sanitation: words(["mobilidade primeiro", "travessia primeiro"], ["mobility first", "crossing first"]),
      sanitation_then_mobility: words(["saneamento primeiro", "lixo primeiro"], ["sanitation first", "waste first"]),
    });
    if (choice) met.add("urban_priority_defined");
    if (containsAny(text, words(["causado", "causa", "ausente", "atrasada"], ["caused", "cause", "missing", "delayed"]))) met.add("urban_root_causes_explained");
    if (choice && mobility && sanitation && containsAny(text, words(["depois", "entao"], ["then", "next"]))) met.add("urban_corrections_ordered");
    if (containsAny(text, words(["verificar", "seguranca", "confirmar"], ["verify", "safety", "check"]))) met.add("urban_safety_check_defined");
    if (containsAny(text, words(["monitorar", "semanalmente", "acompanhar"], ["monitor", "weekly", "follow-up"]))) met.add("urban_followup_defined");
  }

  if (request.missionId === "school_construction") {
    choice = selectChoice(text, {
      school_hub: words(["polo escolar"], ["school hub"]),
      school_greenway: words(["corredor verde"], ["greenway"]),
    });
    if (containsAny(text, words(["escola"], ["school"]))) met.add("school_goal_clear");
    if (containsAny(text, words(["publica", "alunos", "familias", "comunidade"], ["public", "students", "families", "community"]))) met.add("school_public_defined");
    if (choice || containsAny(text, words(["local", "bairro", "terreno"], ["location", "neighborhood", "site"]))) met.add("school_location_defined");
    if (/\b\d+\b/.test(text) && containsAny(text, words(["sala", "capacidade", "alunos"], ["classroom", "capacity", "students"]))) met.add("school_scale_defined");
    if (containsAny(text, words(["porta acessivel", "entrada acessivel", "rampa"], ["accessible door", "accessible entrance", "step-free"]))) met.add("school_accessible");
    if (containsAny(text, words(["travessia segura", "seguranca", "iluminacao"], ["secure crossing", "safe crossing", "safety", "lighting"]))) met.add("school_safety_defined");
    if (choice) met.add("school_site_selected");
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
