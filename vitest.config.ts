import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    restoreMocks: true,
    setupFiles: ["./tests/offline-openai-guard.ts"],
  },
});
