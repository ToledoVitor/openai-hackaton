export class ModerationUnavailableError extends Error {
  constructor() {
    super("Moderation is unavailable.");
    this.name = "ModerationUnavailableError";
  }
}
