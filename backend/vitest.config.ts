import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"]
    },
    fileParallelism: false,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});
