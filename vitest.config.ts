import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname) } }, test: { include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"], testTimeout: 120000, hookTimeout: 120000, pool: "forks", poolOptions: { forks: { singleFork: true } } } });
