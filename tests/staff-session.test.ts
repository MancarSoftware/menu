import { beforeEach, expect, it, vi } from "vitest";
import { getSession } from "@/lib/auth";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), verify: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "test-token-not-a-real-session" }) }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("jose", () => ({ jwtVerify: mocks.verify, SignJWT: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { adminUser: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/token-secret", () => ({ getTokenSecret: () => new Uint8Array(32) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue({ payload: { sub: "staff1", email: "old@example.invalid", role: "ADMIN", iat: 2000 } });
  mocks.findUnique.mockResolvedValue({ id: "staff1", email: "driver@example.invalid", role: "DRIVER", isActive: true, canCollectCash: false, passwordChangedAt: new Date(1000000) });
});

it("uses current database permissions rather than stale JWT role claims", async () => {
  expect(await getSession()).toEqual({ id: "staff1", email: "driver@example.invalid", role: "DRIVER", canCollectCash: false });
});
it("rejects a deactivated staff member immediately", async () => {
  mocks.findUnique.mockResolvedValue({ id: "staff1", role: "DRIVER", isActive: false });
  expect(await getSession()).toBeNull();
});
it("rejects sessions issued before a password reset", async () => {
  mocks.findUnique.mockResolvedValue({ id: "staff1", role: "DRIVER", isActive: true, passwordChangedAt: new Date(3000000) });
  expect(await getSession()).toBeNull();
});
