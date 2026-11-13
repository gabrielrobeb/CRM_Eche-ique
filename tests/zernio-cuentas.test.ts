import { afterEach, expect, it, vi } from "vitest";
import { listAccounts } from "@/lib/zernio/accounts";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("normaliza cuentas con _id y perfil expandido", async () => {
  vi.stubEnv("ZERNIO_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    accounts: [{ _id: "cuenta", platform: "instagram", profileId: { _id: "perfil" } }],
  }), { status: 200 })));
  const result = await listAccounts();
  expect(result.success && result.data.data).toEqual([
    expect.objectContaining({ id: "cuenta", platform: "instagram", profileId: "perfil" }),
  ]);
});

it("conserva el formato data y sus metadatos", async () => {
  vi.stubEnv("ZERNIO_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    data: [{ id: "cuenta", platform: "instagram", profileId: "perfil" }],
    meta: { failedAccounts: [] },
  }), { status: 200 })));
  const result = await listAccounts();
  expect(result.success && result.data).toMatchObject({
    data: [{ id: "cuenta", profileId: "perfil" }], meta: { failedAccounts: [] },
  });
});
