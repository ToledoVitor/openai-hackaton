import type { EvaluateMissionResponse, Language, MissionId } from "../mission-contracts";

const nextInstructions: Record<Language, Record<string, string>> = {
  portuguese: {
    school_goal_clear: "Diga explicitamente que deseja construir uma escola.",
    school_branch_selected: "Escolha escola compacta no centro ou escola com pátio no bairro.",
    school_context_clear: "Explique onde a escola será construída e quem ela atenderá.",
    school_scale_defined: "Informe tamanho, número de salas ou capacidade de alunos.",
    school_accessible: "Peça entrada acessível para todos.",
    school_branch_feature_defined: "Descreva o espaço compacto ou o pátio exigido pelo caminho escolhido.",
    safe_path_goal_clear: "Peça uma rota segura até a escola.",
    child_users_named: "Diga que crianças usarão o caminho.",
    path_branch_selected: "Escolha semáforos inteligentes ou rua calma e arborizada.",
    concrete_example_included: "Inclua um exemplo concreto de como a solução funcionará.",
    safety_criteria_defined: "Defina como saberemos que a travessia ficou segura.",
    accessible_crossing_defined: "Inclua rampas, piso tátil e tempo suficiente para atravessar.",
    path_branch_requirements_defined: "Detalhe temporização inteligente ou redução de velocidade com árvores.",
    both_service_problems_identified: "Separe falta de água e lixo acumulado como dois problemas.",
    service_priority_selected: "Escolha qual serviço será atendido primeiro.",
    priority_reasoned: "Explique por que essa prioridade vem primeiro.",
    ordered_steps_defined: "Liste ações em ordem de execução.",
    secondary_service_preserved: "Agende também o serviço que ficará em segundo lugar.",
    review_step_defined: "Inclua uma verificação final dos dois serviços.",
    city_school_project_selected: "Escolha laboratório de IA ou biblioteca com praça de leitura.",
    temperature_provided: "Selecione temperatura baixa, média ou alta.",
    creative_temperature_tested: "Teste uma temperatura que permita variedade no projeto criativo.",
    critical_temperature_tested: "Teste temperatura baixa para instruções críticas mais previsíveis.",
    expected_behavior_explained: "Explique como a temperatura muda criatividade e precisão.",
    project_constraints_defined: "Defina público, espaço e requisitos do projeto escolar.",
    temperature_comparison_complete: "Compare os resultados criativo e crítico.",
    housing_goal_clear: "Peça explicitamente a construção de moradias.",
    housing_residents_defined: "Diga quais moradores serão atendidos.",
    housing_capacity_defined: "Defina quantas unidades serão construídas.",
    housing_budget_defined: "Informe um orçamento realista.",
    housing_accessibility_defined: "Inclua acesso sem barreiras.",
    housing_green_space_defined: "Reserve uma área verde para moradores.",
    hospital_goal_clear: "Peça explicitamente a construção do hospital.",
    hospital_service_priority_defined: "Escolha qual serviço de saúde vem primeiro.",
    hospital_emergency_access_defined: "Planeje acesso separado para ambulâncias.",
    hospital_capacity_defined: "Defina capacidade em leitos ou atendimentos.",
    hospital_safety_constraints_defined: "Inclua rotas seguras e controle de riscos.",
    hospital_success_measure_defined: "Defina uma meta mensurável de atendimento.",
    urban_problems_diagnosed: "Identifique a travessia insegura e o lixo acumulado.",
    urban_priority_defined: "Escolha mobilidade ou saneamento como primeira prioridade.",
    urban_root_causes_explained: "Explique a causa de cada problema.",
    urban_corrections_ordered: "Coloque as duas correções em ordem.",
    urban_safety_check_defined: "Inclua uma verificação de segurança.",
    urban_followup_defined: "Planeje acompanhamento depois das correções.",
  },
  english: {
    school_goal_clear: "Explicitly ask to build a school.",
    school_branch_selected: "Choose a compact downtown school or a neighborhood school with a yard.",
    school_context_clear: "Explain where the school will be built and whom it will serve.",
    school_scale_defined: "State size, number of classrooms, or student capacity.",
    school_accessible: "Require an entrance accessible to everyone.",
    school_branch_feature_defined: "Describe the compact footprint or yard required by your chosen path.",
    safe_path_goal_clear: "Ask for a safe route to school.",
    child_users_named: "State that children will use the route.",
    path_branch_selected: "Choose smart signals or a calm, tree-lined street.",
    concrete_example_included: "Include a concrete example of how the solution will work.",
    safety_criteria_defined: "Define how we will know the crossing is safe.",
    accessible_crossing_defined: "Include curb ramps, tactile paving, and enough crossing time.",
    path_branch_requirements_defined: "Detail smart timing or speed reduction with trees.",
    both_service_problems_identified: "Separate the water shortage and garbage buildup into two problems.",
    service_priority_selected: "Choose which service will be handled first.",
    priority_reasoned: "Explain why that priority comes first.",
    ordered_steps_defined: "List actions in execution order.",
    secondary_service_preserved: "Schedule the second-priority service too.",
    review_step_defined: "Include a final check of both services.",
    city_school_project_selected: "Choose an AI lab or a library with a reading plaza.",
    temperature_provided: "Select low, medium, or high temperature.",
    creative_temperature_tested: "Test a temperature that allows variety in the creative project.",
    critical_temperature_tested: "Test a low temperature for more predictable critical instructions.",
    expected_behavior_explained: "Explain how temperature changes creativity and precision.",
    project_constraints_defined: "Define audience, space, and requirements for the school project.",
    temperature_comparison_complete: "Compare creative and critical results.",
    housing_goal_clear: "Explicitly request new housing.",
    housing_residents_defined: "State which residents will be served.",
    housing_capacity_defined: "Define how many units will be built.",
    housing_budget_defined: "Provide a realistic budget.",
    housing_accessibility_defined: "Include step-free access.",
    housing_green_space_defined: "Reserve green space for residents.",
    hospital_goal_clear: "Explicitly request the hospital.",
    hospital_service_priority_defined: "Choose which health service comes first.",
    hospital_emergency_access_defined: "Plan separate ambulance access.",
    hospital_capacity_defined: "Define capacity in beds or visits.",
    hospital_safety_constraints_defined: "Include safe routes and risk controls.",
    hospital_success_measure_defined: "Set a measurable care target.",
    urban_problems_diagnosed: "Identify the unsafe crossing and accumulated waste.",
    urban_priority_defined: "Choose mobility or sanitation as first priority.",
    urban_root_causes_explained: "Explain each problem's cause.",
    urban_corrections_ordered: "Put both corrections in order.",
    urban_safety_check_defined: "Include a safety check.",
    urban_followup_defined: "Plan follow-up after corrections.",
  },
};

const pathNames: Record<Language, Record<string, string>> = {
  portuguese: {
    compact_center: "escola compacta no centro",
    yard_neighborhood: "escola com pátio no bairro",
    smart_signals: "semáforos inteligentes",
    calm_green_street: "rua calma e arborizada",
    water_first: "abastecimento de água primeiro",
    garbage_first: "coleta de lixo primeiro",
    ai_lab: "laboratório de IA",
    reading_plaza: "biblioteca com praça de leitura",
    balanced_housing: "moradia equilibrada e acessível",
    emergency_ready: "hospital preparado para emergências",
    mobility_then_sanitation: "mobilidade e depois saneamento",
    sanitation_then_mobility: "saneamento e depois mobilidade",
  },
  english: {
    compact_center: "compact downtown school",
    yard_neighborhood: "neighborhood school with a yard",
    smart_signals: "smart signals",
    calm_green_street: "calm, tree-lined street",
    water_first: "water supply first",
    garbage_first: "garbage collection first",
    ai_lab: "AI lab",
    reading_plaza: "library with a reading plaza",
    balanced_housing: "balanced, accessible housing",
    emergency_ready: "emergency-ready hospital",
    mobility_then_sanitation: "mobility, then sanitation",
    sanitation_then_mobility: "sanitation, then mobility",
  },
};

export function createFeedback(input: {
  language: Language;
  missionId: MissionId;
  status: EvaluateMissionResponse["status"];
  choice: string | null;
  nextMissingCriterion: string | null;
}): EvaluateMissionResponse["feedback"] {
  const { language, status } = input;

  if (status === "redirected") {
    return language === "portuguese"
      ? {
          summary: "Vamos manter o foco nesta missão.",
          explanation: "Seu comando não descreve o projeto pedido pela cidade.",
          nextInstruction: "Tente novamente usando o objetivo desta missão.",
        }
      : {
          summary: "Let's stay focused on this mission.",
          explanation: "Your command does not describe the project requested by the city.",
          nextInstruction: "Try again using this mission's goal.",
        };
  }

  if (status === "success") {
    const path = input.choice ? pathNames[language][input.choice] : undefined;
    return language === "portuguese"
      ? {
          summary: "Missão concluída: a cidade foi transformada.",
          explanation: path ? `Projeto concluído: ${path}.` : "Todos os critérios foram atendidos.",
          nextInstruction: null,
        }
      : {
          summary: "Mission complete: the city has been transformed.",
          explanation: path ? `Completed project: ${path}.` : "Every criterion was satisfied.",
          nextInstruction: null,
        };
  }

  const nextInstruction = input.nextMissingCriterion
    ? nextInstructions[language][input.nextMissingCriterion] ??
      (language === "portuguese" ? "Acrescente o próximo detalhe pedido." : "Add the next requested detail.")
    : null;
  const summary =
    language === "portuguese"
      ? status === "retry"
        ? "A cidade ainda não mudou."
        : "O projeto melhorou, mas ainda falta um detalhe."
      : status === "retry"
        ? "The city has not changed yet."
        : "The project improved, but one detail still needs work.";

  return {
    summary,
    explanation:
      language === "portuguese"
        ? `Próximo critério: ${nextInstruction ?? "revise o comando"}`
        : `Next criterion: ${nextInstruction ?? "revise the command"}`,
    nextInstruction,
  };
}
