import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  select: vi.fn(), create: vi.fn(), execute: vi.fn(), deliver: vi.fn(),
}));
vi.mock("@/db", () => ({ db: { select: mock.select, update: vi.fn(() => ({ set: () => ({ where: async () => {} }) })) } }));
vi.mock("@/lib/config", () => ({ getConfig: () => ({ agente: { mensajeDerivacion: "General", mensajesDerivacion: { riesgo_personal: "Emergencia: 133 y 149", plazo_proximo: "Marcada urgente; no confirma representación" } }, roles: { etiquetaAsesor: "Asesor" } }) }));
vi.mock("@/lib/channels/deliver", () => ({ getConversationRow: async () => ({ id: "conversacion", contactId: "contacto", channel: "whatsapp", provider: "simulador", aiEnabled: true }), deliverMessage: mock.deliver }));
vi.mock("@/lib/team", () => ({ listMembers: async () => [], displayName: () => "" }));
vi.mock("@/lib/agent/config", () => ({ getAgentConfig: async () => ({ enabled: true, model: "modelo", systemPrompt: "prompt", enabledTools: ["derivar_asesor"] }) }));
vi.mock("@/lib/agent/prompt", () => ({ renderContexto: async () => "", renderSystemPrompt: () => "prompt" }));
vi.mock("@/lib/agent/provider", () => ({ getAgentClient: () => ({ chat: { completions: { create: mock.create } } }), getAgentModel: () => "modelo", hasAgentKey: () => true, opcionesRazonamiento: () => ({}) }));
vi.mock("@/lib/agent/tools", () => ({ getEnabledToolDefinitions: async () => [{ type: "function", function: { name: "derivar_asesor" } }], executeTool: mock.execute }));
import { runAgentForConversation } from "@/lib/agent";

beforeEach(() => {
  vi.clearAllMocks();
  mock.select.mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [{ id: "contacto", aiEnabled: true }] }) }) })
    .mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ direction: "in", body: "Solicitud ficticia" }] }) }) }) });
  mock.create.mockResolvedValue({ choices: [{ finish_reason: "tool_calls", message: { role: "assistant", tool_calls: [{ id: "call", type: "function", function: { name: "derivar_asesor", arguments: "{}" } }] } }] });
  mock.deliver.mockResolvedValue({ ok: true });
});

it.each([
  ["riesgo_personal", "Emergencia: 133 y 149"],
  ["plazo_proximo", "Marcada urgente; no confirma representación"],
  ["general", "General"],
])("envía el aviso de %s cuando la herramienta pausa el agente", async (tipo, texto) => {
  mock.execute.mockResolvedValue({ ok: true, stop: true, data: { tipoDerivacion: tipo } });
  const result = await runAgentForConversation("conversacion");
  expect(result).toMatchObject({ ok: true, reason: "handoff", reply: texto });
  expect(mock.deliver).toHaveBeenCalledWith("conversacion", { text: texto }, "agent");
  expect(mock.create).toHaveBeenCalledTimes(1);
});

it.each([
  ["Mi ex me amenazó con hacerme daño y tengo miedo de ir a la audiencia", "riesgo_personal", "Emergencia: 133 y 149"],
  ["Tengo audiencia mañana a las 9 y no tengo abogado, ¿pueden representarme?", "plazo_proximo", "Marcada urgente; no confirma representación"],
])("deriva antes de consultar al modelo ante %s", async (texto, tipo, reply) => {
  mock.select.mockReset();
  mock.select.mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [{ id: "contacto", aiEnabled: true }] }) }) })
    .mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ direction: "in", body: texto }] }) }) }) });
  mock.execute.mockResolvedValue({ ok: true, stop: true, data: { tipoDerivacion: tipo } });
  expect(await runAgentForConversation("conversacion")).toMatchObject({ ok: true, reason: "handoff", reply });
  expect(mock.execute).toHaveBeenCalledWith("derivar_asesor", expect.objectContaining({ tipo }), expect.anything());
  expect(mock.create).not.toHaveBeenCalled();
});
