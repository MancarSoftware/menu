import { defineConfig } from "vitest/config";
import path from "node:path";

if (process.env.ALLOW_DATABASE_TESTS !== "1") throw new Error("Use npm run test:db with an approved .env.test. Database tests are disabled by default.");

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { environment: "node", include: ["tests/**/*.integration.test.ts"], testTimeout: 30000, fileParallelism: false },
});
