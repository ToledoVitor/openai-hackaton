import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environmentMatchGlobs: [["src/audio/__tests__/react*.test.tsx", "jsdom"]],
    restoreMocks: true,
  },
});
