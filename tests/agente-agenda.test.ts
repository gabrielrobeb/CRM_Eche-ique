import { afterEach, expect, it, vi } from "vitest";
import { getBookingUrl } from "@/lib/agent/agenda";
import { renderSystemPrompt } from "@/lib/agent/prompt";

afterEach(() => vi.unstubAllEnvs());

it("permite el marcador autorizado sin inventar una URL", () => {
  vi.stubEnv("AGENDA_URL", "[LINK]");
  expect(getBookingUrl()).toBe("[LINK]");
  expect(renderSystemPrompt("Agenda: {{enlace_agenda}}", { channel: "simulador" })).toBe("Agenda: [LINK]");
});

it("acepta el enlace configurado y rechaza protocolos inseguros", () => {
  vi.stubEnv("AGENDA_URL", "https://agenda.example/diagnostico");
  expect(getBookingUrl()).toBe("https://agenda.example/diagnostico");
  vi.stubEnv("AGENDA_URL", "javascript:alert(1)");
  expect(getBookingUrl()).toBeNull();
});

it("indica que falta configurar la agenda si no hay enlace", () => {
  vi.stubEnv("AGENDA_URL", "");
  expect(getBookingUrl()).toBeNull();
  expect(renderSystemPrompt("{{enlace_agenda}}", { channel: "simulador" })).toContain("NO CONFIGURADO");
});

it("conserva la sección de agenda autorizada para las pruebas", () => {
  vi.stubEnv("AGENDA_URL", "https://echeniqueabogados.site/#agenda");
  expect(getBookingUrl()).toBe("https://echeniqueabogados.site/#agenda");
  expect(renderSystemPrompt("Agenda: {{enlace_agenda}}", { channel: "simulador" })).toBe("Agenda: https://echeniqueabogados.site/#agenda");
});
