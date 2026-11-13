import { afterEach, describe, expect, it, vi } from "vitest";
import { firmarTesteo, validarTesteo } from "../src/lib/testeo-token";

afterEach(() => vi.unstubAllEnvs());

describe("enlaces de testeo", () => {
  it("acepta una firma vigente únicamente para su alcance", () => {
    vi.stubEnv("AGENT_WORKER_SECRET", "secreto-de-prueba");
    const token = firmarTesteo("conversacion:uno");
    expect(validarTesteo(token, "conversacion:uno")).toBe(true);
    expect(validarTesteo(token, "conversacion:dos")).toBe(false);
    expect(validarTesteo(token, "acceso")).toBe(false);
  });

  it("rechaza enlaces vencidos, alterados o firmados con otra clave", () => {
    vi.stubEnv("AGENT_WORKER_SECRET", "secreto-de-prueba");
    expect(validarTesteo(firmarTesteo("acceso", Date.now() - 1), "acceso")).toBe(false);
    const token = firmarTesteo("acceso");
    expect(validarTesteo(`${token}x`, "acceso")).toBe(false);
    vi.stubEnv("AGENT_WORKER_SECRET", "otra-clave");
    expect(validarTesteo(token, "acceso")).toBe(false);
  });

  it("falla cerrado sin clave configurada", () => {
    vi.stubEnv("AGENT_WORKER_SECRET", "");
    expect(() => firmarTesteo("acceso")).toThrow();
    expect(validarTesteo("algo.falso", "acceso")).toBe(false);
  });
});
