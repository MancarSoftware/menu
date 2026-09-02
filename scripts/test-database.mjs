// Never fall back to .env: it may contain production credentials.
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (!["test", "migrate", "e2e"].includes(mode)) throw new Error("Expected test, migrate or e2e.");
if (!existsSync(".env.test")) throw new Error("Create ignored .env.test with DATABASE_URL and TEST_DATABASE_DISPOSABLE=true.");
const config = parseEnv(readFileSync(".env.test", "utf8"));
if (config.TEST_DATABASE_DISPOSABLE !== "true" || !config.DATABASE_URL) throw new Error(".env.test must explicitly declare TEST_DATABASE_DISPOSABLE=true and DATABASE_URL.");
let target;
try { target = new URL(config.DATABASE_URL); } catch { throw new Error("Invalid test database URL."); }
if (!["postgres:", "postgresql:"].includes(target.protocol)) throw new Error("A PostgreSQL test database is required.");
if (existsSync(".env")) {
  const local = parseEnv(readFileSync(".env", "utf8"));
  if (local.DATABASE_URL) {
    const current = new URL(local.DATABASE_URL);
    // Neon pooled/direct hosts address the same database: normalize both.
    const identity = (url) => `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port}${url.pathname}`;
    if (identity(current) === identity(target)) throw new Error("Refusing to use the database configured in .env. Select a separate disposable branch.");
  }
}
const env = { ...process.env, ...config, DATABASE_URL: config.DATABASE_URL, ALLOW_DATABASE_TESTS: "1", ADMIN_EMAIL: config.ADMIN_EMAIL ?? "", ADMIN_PASSWORD: config.ADMIN_PASSWORD ?? "", SESSION_SECRET: config.SESSION_SECRET ?? "" };
if (mode === "e2e" && (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.SESSION_SECRET.length < 32)) throw new Error("E2E requires staging-only ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET (32+ characters) in .env.test.");
const args = mode === "test" ? ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.database.config.ts"] : mode === "e2e" ? ["node_modules/@playwright/test/cli.js", "test"] : ["node_modules/prisma/build/index.js", "migrate", "deploy"];
console.log(mode === "migrate" ? "Applying migrations to the explicitly approved disposable database (credentials hidden)." : "Running isolated tests (credentials hidden).");
const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
