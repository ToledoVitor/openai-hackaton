import type { Language } from "../domain/mission-contracts";

export const REQUIRED_UI_KEYS = [
  "language_label", "portuguese", "english", "start", "start_hint",
  "tagline", "before_start", "name_question", "name_help", "name_label",
  "name_placeholder", "name_error", "enter_city", "back", "loading_city",
  "loading_error", "missions_complete", "city_status", "recommended_next",
  "mission_concept", "mission_objective", "expected_outcome", "prerequisite",
  "no_prerequisite", "briefing", "hint", "your_plan", "prompt_placeholder",
  "submit_plan", "evaluating", "feedback", "next_mission", "journey_complete",
  "locked", "retry", "start_voice", "stop_voice", "voice_optional",
  "camera_overview", "camera_mission", "explore_help", "npc_issue",
  "npc_empty", "day", "budget", "city_health", "error_invalid_request",
  "error_rate_limited", "error_provider_unavailable", "error_invalid_response",
  "error_network", "error_timeout", "error_unknown", "audio", "audio_off",
  "music", "ambience", "mute", "unmute", "prototype",
] as const;

export type UiCopyKey = (typeof REQUIRED_UI_KEYS)[number];
type UiCopy = Record<UiCopyKey, string>;

export const UI_COPY: Record<Language, UiCopy> = {
  portuguese: {
    language_label: "Idioma", portuguese: "Português", english: "English",
    start: "Começar", start_hint: "clique ou pressione Espaço",
    tagline: "Uma cidade feita de escolhas, educação e inteligência artificial.",
    before_start: "Antes de começar", name_question: "Como podemos chamar você?",
    name_help: "A cidade espera sua primeira decisão como prefeito.", name_label: "Seu nome",
    name_placeholder: "Digite seu nome", name_error: "Digite pelo menos duas letras.",
    enter_city: "Entrar em AI City", back: "Voltar", loading_city: "Construindo a cidade…",
    loading_error: "Não foi possível carregar a cidade. Recarregue para tentar novamente.",
    missions_complete: "Missões concluídas", city_status: "Estado da cidade",
    recommended_next: "Próxima missão recomendada", mission_concept: "Conceito",
    mission_objective: "Objetivo", expected_outcome: "Resultado esperado",
    prerequisite: "Pré-requisito", no_prerequisite: "Nenhum — comece aqui",
    briefing: "Briefing", hint: "Dica", your_plan: "Seu plano para a cidade",
    prompt_placeholder: "Descreva objetivo, pessoas atendidas, requisitos, limites e como medir sucesso…",
    submit_plan: "Avaliar plano", evaluating: "Avaliando com segurança…", feedback: "Feedback",
    next_mission: "Ir para próxima missão", journey_complete: "Jornada concluída",
    locked: "Conclua a missão anterior para desbloquear.", retry: "Tentar novamente",
    start_voice: "Iniciar conversa por voz", stop_voice: "Encerrar voz",
    voice_optional: "Opcional · usa conexão Realtime somente após sua confirmação",
    camera_overview: "Visão geral", camera_mission: "Focar missão",
    explore_help: "Explore com WASD ou setas. Toque ou clique no chão para ir até lá.",
    npc_issue: "Relato dos moradores", npc_empty: "Aproxime-se de um morador para ouvir o relato.",
    day: "Dia", budget: "Orçamento", city_health: "Bem-estar",
    error_invalid_request: "Revise o plano e tente novamente.",
    error_rate_limited: "Muitas avaliações agora. Aguarde um minuto e tente novamente.",
    error_provider_unavailable: "A avaliação está indisponível. Seu progresso foi preservado; tente novamente.",
    error_invalid_response: "Recebemos uma resposta inválida. Tente novamente sem perder o progresso.",
    error_network: "Sem conexão com o servidor. Verifique sua rede e tente novamente.",
    error_timeout: "A avaliação excedeu o tempo limite. Tente novamente.",
    error_unknown: "Algo deu errado. Seu progresso está seguro; tente novamente.",
    audio: "Som", audio_off: "Som desligado", music: "Trilha sonora",
    ambience: "Sons da cidade", mute: "Silenciar", unmute: "Ativar",
    prototype: "Protótipo do hackathon da OpenAI",
  },
  english: {
    language_label: "Language", portuguese: "Português", english: "English",
    start: "Start", start_hint: "click or press Space",
    tagline: "A city shaped by choices, education, and artificial intelligence.",
    before_start: "Before you begin", name_question: "What should we call you?",
    name_help: "The city awaits your first decision as mayor.", name_label: "Your name",
    name_placeholder: "Enter your name", name_error: "Enter at least two letters.",
    enter_city: "Enter AI City", back: "Back", loading_city: "Building the city…",
    loading_error: "The city could not load. Reload to try again.",
    missions_complete: "Missions complete", city_status: "City status",
    recommended_next: "Recommended next mission", mission_concept: "Concept",
    mission_objective: "Objective", expected_outcome: "Expected outcome",
    prerequisite: "Prerequisite", no_prerequisite: "None — start here",
    briefing: "Briefing", hint: "Hint", your_plan: "Your city plan",
    prompt_placeholder: "Describe the goal, people served, requirements, constraints, and how success will be measured…",
    submit_plan: "Evaluate plan", evaluating: "Evaluating safely…", feedback: "Feedback",
    next_mission: "Go to next mission", journey_complete: "Journey complete",
    locked: "Complete the previous mission to unlock this one.", retry: "Try again",
    start_voice: "Start voice conversation", stop_voice: "End voice",
    voice_optional: "Optional · uses Realtime only after you confirm",
    camera_overview: "Overview", camera_mission: "Focus mission",
    explore_help: "Explore with WASD or arrow keys. Tap or click the ground to move there.",
    npc_issue: "Resident report", npc_empty: "Approach a resident to hear their report.",
    day: "Day", budget: "Budget", city_health: "Well-being",
    error_invalid_request: "Review your plan and try again.",
    error_rate_limited: "Too many evaluations right now. Wait a minute and try again.",
    error_provider_unavailable: "Evaluation is unavailable. Your progress is preserved; try again.",
    error_invalid_response: "We received an invalid response. Try again without losing progress.",
    error_network: "Cannot reach the server. Check your connection and try again.",
    error_timeout: "Evaluation timed out. Try again.",
    error_unknown: "Something went wrong. Your progress is safe; try again.",
    audio: "Sound", audio_off: "Sound off", music: "Music",
    ambience: "City sounds", mute: "Mute", unmute: "Turn on",
    prototype: "OpenAI hackathon prototype",
  },
};

function humanize(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "Missing text";
}

export function uiText(language: Language, key: string): string {
  return (UI_COPY[language] as Record<string, string>)[key]
    ?? (UI_COPY.portuguese as Record<string, string>)[key]
    ?? humanize(key);
}
