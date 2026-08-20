import type { Language } from "../domain/mission-contracts";
import { uiText } from "./ui-copy";

export type CheckpointGroupId = "complete" | "new" | "pending";
export type CheckpointGroup = {
  id: CheckpointGroupId;
  title: string;
  criteria: string[];
};

type MissionProgress = {
  satisfied: readonly string[];
  newlySatisfied: readonly string[];
  regressed: readonly string[];
  missing: readonly string[];
};

export function checkpointGroups(progress: MissionProgress, language: Language): CheckpointGroup[] {
  const newlySatisfied = new Set(progress.newlySatisfied);
  const groups: CheckpointGroup[] = [
    {
      id: "complete",
      title: uiText(language, "checkpoint_complete"),
      criteria: progress.satisfied.filter((criterion) => !newlySatisfied.has(criterion)),
    },
    {
      id: "new",
      title: uiText(language, "checkpoint_new"),
      criteria: [...progress.newlySatisfied],
    },
    {
      id: "pending",
      title: uiText(language, "checkpoint_pending"),
      criteria: [...progress.missing],
    },
  ];
  return groups.filter((group) => group.criteria.length > 0);
}

export function regressionNotice(progress: MissionProgress, language: Language): string | null {
  if (progress.regressed.length === 0) return null;
  const criteria = progress.regressed.map((criterion) => criterionText(criterion, language)).join(", ");
  return language === "portuguese"
    ? `A decisão anterior sobre ${criteria} foi substituída; revise este requisito.`
    : `The previous decision about ${criteria} was replaced; review this requirement.`;
}

const criterionCopy: Partial<Record<string, Record<Language, string>>> = {
  housing_goal_clear: { portuguese: "Construção de moradias", english: "Housing construction" },
  housing_residents_defined: { portuguese: "Moradores atendidos", english: "Residents served" },
  housing_capacity_defined: { portuguese: "Quantidade de unidades", english: "Number of homes" },
  housing_budget_defined: { portuguese: "Orçamento", english: "Budget" },
  housing_accessibility_defined: { portuguese: "Acesso sem barreiras", english: "Step-free access" },
  housing_green_space_defined: { portuguese: "Área verde", english: "Green space" },
  hospital_goal_clear: { portuguese: "Construção do hospital", english: "Hospital construction" },
  hospital_service_priority_defined: { portuguese: "Serviço prioritário", english: "Priority service" },
  hospital_emergency_access_defined: { portuguese: "Acesso de ambulâncias", english: "Ambulance access" },
  hospital_capacity_defined: { portuguese: "Capacidade de atendimento", english: "Care capacity" },
  hospital_safety_constraints_defined: { portuguese: "Segurança", english: "Safety" },
  hospital_success_measure_defined: { portuguese: "Meta de atendimento", english: "Care target" },
  urban_problems_diagnosed: { portuguese: "Problemas identificados", english: "Problems identified" },
  urban_priority_defined: { portuguese: "Prioridade escolhida", english: "Priority chosen" },
  urban_root_causes_explained: { portuguese: "Causas explicadas", english: "Causes explained" },
  urban_corrections_ordered: { portuguese: "Correções em ordem", english: "Corrections ordered" },
  urban_safety_check_defined: { portuguese: "Verificação de segurança", english: "Safety check" },
  urban_followup_defined: { portuguese: "Acompanhamento", english: "Follow-up" },
  school_goal_clear: { portuguese: "Construção da escola", english: "School construction" },
  school_public_defined: { portuguese: "Público atendido", english: "Public served" },
  school_location_defined: { portuguese: "Localização", english: "Location" },
  school_scale_defined: { portuguese: "Escala da escola", english: "School scale" },
  school_accessible: { portuguese: "Porta acessível", english: "Accessible entrance" },
  school_safety_defined: { portuguese: "Segurança do acesso", english: "Access safety" },
  school_site_selected: { portuguese: "Implantação escolhida", english: "Site choice" },
};

export function criterionText(criterion: string, language: Language): string {
  const localized = criterionCopy[criterion]?.[language];
  if (localized) return localized;
  const words = criterion.replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : criterion;
}
