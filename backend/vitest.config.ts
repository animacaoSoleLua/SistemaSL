import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"]
    },
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});
