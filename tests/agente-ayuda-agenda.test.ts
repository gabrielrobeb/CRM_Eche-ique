import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DERIVACION_AYUDA, DERIVACION_HORARIO } from "@/lib/agent/asistencia-agenda";

const mock = vi.hoisted(() => ({ select: vi.fn(), create: vi.fn(), execute: vi.fn(), deliver: vi.fn(), schedule: vi.fn(), historial: [] as Array<{ direction: string; body: string }> }));
vi.mock("@/db", () => ({ db: { select: mock.select, update: vi.fn(() => ({ set: () => ({ where: async () => {} }) })) } }));
vi.mock("@/lib/config", () => ({ getConfig: () => ({ agente: { agenda: {
  asistenciaEquipo: true, campoArea: "area_juridica", tarifas: { Familia: 50000 }, seguimiento: { minutos: 30 },
}, mensajeDerivacion: "Dejé tu solicitud para el equipo." }, roles: { etiquetaAsesor: "Asesor" } }) }));
vi.mock("@/lib/channels/deliver", () => ({ getConversationRow: async () => ({ id: "hilo", contactId: "contacto", channel: "whatsapp", provider: "simulador", aiEnabled: true }), deliverMessage: mock.deliver }));
vi.mock("@/lib/team", () => ({ listMembers: async () => [], displayName: () => "" }));
vi.mock("@/lib/agent/config", () => ({ getAgentConfig: async () => ({ enabled: true, model: "modelo", systemPrompt: "prompt", enabledTools: ["derivar_asesor"] }) }));
vi.mock("@/lib/agent/prompt", () => ({ renderContexto: async () => "", renderSystemPrompt: (p: string) => p }));
vi.mock("@/lib/agent/provider", () => ({ getAgentClient: () => ({ chat: { completions: { create: mock.create } } }), getAgentModel: () => "modelo", hasAgentKey: () => true, opcionesRazonamiento: () => ({}) }));
vi.mock("@/lib/agent/tools", () => ({ getEnabledToolDefinitions: async () => [{ type: "function", function: { name: "derivar_asesor" } }], executeTool: mock.execute }));
vi.mock("@/lib/agent/seguimiento-agenda", () => ({ programarSeguimientoAgenda: mock.schedule }));
import { runAgentForConversation } from "@/lib/agent";

beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("AGENDA_URL", "https://agenda.example/consulta");
  mock.select.mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [{ id: "contacto", aiEnabled: true }] }) }) })
    .mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => mock.historial.slice().reverse() }) }) }) })
    .mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [{ campos: { area_juridica: "Familia" } }] }) }) });
  mock.deliver.mockResolvedValue({ ok: true, messageId: "saliente" });
  mock.execute.mockResolvedValue({ ok: true, stop: true });
  mock.create.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: "Entendido, sin problemas." } }] });
});
afterEach(() => vi.unstubAllEnvs());

it.each([
  ["No puedo a esas horas. Salgo a las 20:00", DERIVACION_HORARIO],
  ["No manejo mucho tecnología", DERIVACION_AYUDA],
])("ejecuta la derivación directamente cuando dice %s", async (mensaje, aviso) => {
  mock.historial = [{ direction: "in", body: mensaje }];
  expect(await runAgentForConversation("hilo")).toMatchObject({ ok: true, reply: aviso, reason: "handoff" });
  expect(mock.execute).toHaveBeenCalledWith("derivar_asesor", expect.objectContaining({ tipo: "general" }), expect.objectContaining({ conversationId: "hilo" }));
  expect(mock.deliver).toHaveBeenCalledWith("hilo", { text: aviso }, "agent");
  expect(mock.execute.mock.invocationCallOrder[0]).toBeLessThan(mock.deliver.mock.invocationCallOrder[0]);
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.schedule).not.toHaveBeenCalled();
});

it("no anuncia una derivación que la herramienta no pudo completar", async () => {
  mock.historial = [{ direction: "in", body: "No sé agendar" }];
  mock.execute.mockResolvedValue({ ok: false, error: "No se pudo derivar" });
  expect(await runAgentForConversation("hilo")).toMatchObject({ ok: false, reason: "No se pudo derivar" });
  expect(mock.deliver).not.toHaveBeenCalled();
});

it("respeta el rechazo explícito a la derivación", async () => {
  mock.historial = [{ direction: "in", body: "No sé agendar, pero no quiero que me deriven" }];
  expect(await runAgentForConversation("hilo")).toMatchObject({ ok: true });
  expect(mock.execute).not.toHaveBeenCalled();
});

it("activa el seguimiento después de entregar el enlace y no si el envío falla", async () => {
  mock.historial = [{ direction: "in", body: "Quiero agendar" }];
  await runAgentForConversation("hilo");
  expect(mock.schedule).toHaveBeenCalledWith("hilo", "saliente", expect.stringContaining("https://agenda.example/consulta"));
  expect(mock.deliver.mock.invocationCallOrder[0]).toBeLessThan(mock.schedule.mock.invocationCallOrder[0]);
});

it("no programa seguimiento tras un envío fallido", async () => {
  mock.historial = [{ direction: "in", body: "Quiero agendar" }];
  mock.deliver.mockResolvedValue({ ok: false, messageId: "fallido", error: "timeout" });
  expect(await runAgentForConversation("hilo")).toMatchObject({ ok: false });
  expect(mock.schedule).not.toHaveBeenCalled();
});

it("impide que una respuesta del modelo ofrezca cuotas para la consulta", async () => {
  mock.historial = [{ direction: "in", body: "¿Dan cuotas para pagar la consulta?" }];
  mock.create.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: "Sí, puedes pagar en cuotas." } }] });
  expect((await runAgentForConversation("hilo")).reply).toMatch(/no se paga en cuotas[\s\S]*15 días[\s\S]*diagnóstico escrito/);
});
