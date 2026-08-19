import type { HintKey } from "./contracts";

export const HINT_TEXT: Readonly<Record<HintKey, string>> = Object.freeze({
  stateGoal: "State the civic goal so the construction team knows what success looks like.",
  addCitizenContext: "Add a citizen’s practical need to ground the Town Hall plan in daily use.",
  requireAccessibleEntrance: "Require a step-free, accessible entrance with enough room for every visitor.",
  requireClearSign: "Require a clear, readable CITY HALL sign that helps new visitors find the building.",
  requireWeatherCover: "Require weather cover at the entrance so people can arrive comfortably in rain or sun.",
  describeOutput: "Describe the finished Town Hall so the construction team can check its work.",
  celebrate: "Town Hall is ready to welcome the city—take a moment to celebrate the repair.",
  playfulRedirect: "Let’s return to the Town Hall project and make the civic plan more useful.",
});
