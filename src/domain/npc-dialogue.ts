import type { Language } from "./mission-contracts";
import type { JourneyState, LearningMissionId } from "./learning-journey";

export const NPC_IDS = ["housing_resident", "hospital_nurse", "urban_guardian"] as const;
export type NpcId = (typeof NPC_IDS)[number];

type NpcDefinition = {
  relatedMissionId: LearningMissionId;
  name: Record<Language, string>;
  unsolved: Record<Language, string>;
  improved: Record<Language, string>;
};

const NPCS: Record<NpcId, NpcDefinition> = {
  housing_resident: {
    relatedMissionId: "apartment_construction",
    name: { portuguese: "Lia · moradora", english: "Lia · resident" },
    unsolved: {
      portuguese: "Muitas famílias ainda não têm moradia acessível perto dos serviços.",
      english: "Many families still lack accessible housing near city services.",
    },
    improved: {
      portuguese: "As novas moradias acolheram famílias e preservaram espaço verde.",
      english: "New homes welcomed families while preserving green space.",
    },
  },
  hospital_nurse: {
    relatedMissionId: "hospital_construction",
    name: { portuguese: "Ravi · enfermeiro", english: "Ravi · nurse" },
    unsolved: {
      portuguese: "Emergências demoram porque faltam leitos e acesso seguro para ambulâncias.",
      english: "Emergency care is delayed by too few beds and unsafe ambulance access.",
    },
    improved: {
      portuguese: "Agora ambulâncias chegam por uma rota segura e o atendimento tem uma meta clara.",
      english: "Ambulances now use a safe route and emergency care has a clear target.",
    },
  },
  urban_guardian: {
    relatedMissionId: "urban_repair",
    name: { portuguese: "Noa · agente urbano", english: "Noa · city steward" },
    unsolved: {
      portuguese: "A travessia continua insegura e o lixo acumulado ameaça este quarteirão.",
      english: "The crossing remains unsafe and accumulated waste threatens this block.",
    },
    improved: {
      portuguese: "A travessia foi corrigida, a coleta voltou e a equipe acompanha os resultados.",
      english: "The crossing is safer, collection resumed, and the team monitors results.",
    },
  },
};

const NPC_BY_MISSION: Readonly<Record<LearningMissionId, NpcId>> = {
  apartment_construction: "housing_resident",
  hospital_construction: "hospital_nurse",
  urban_repair: "urban_guardian",
};

export function getNpcForMission(missionId: LearningMissionId): NpcId {
  return NPC_BY_MISSION[missionId];
}

export function getNpcDialogue(npcId: NpcId, state: JourneyState, language: Language) {
  const npc = NPCS[npcId];
  const improved = state.completedMissionIds.includes(npc.relatedMissionId);
  return {
    npcId,
    relatedMissionId: npc.relatedMissionId,
    name: npc.name[language],
    line: (improved ? npc.improved : npc.unsolved)[language],
    state: improved ? "improved" as const : "unsolved" as const,
  };
}
