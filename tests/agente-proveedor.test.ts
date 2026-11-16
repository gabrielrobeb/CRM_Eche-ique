import { afterEach, expect, it, vi } from "vitest";
import { agentKeyVariable, getAgentClient, getAgentModel, getAgentProvider, hasAgentKey, opcionesRazonamiento } from "@/lib/agent/provider";

vi.mock("@/lib/config", () => ({
  getConfig: () => ({ agente: {} }),
  marca: () => ({ nombre: "CRM de pruebas" }),
}));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function entorno() {
  for (const key of ["AGENT_PROVIDER", "AGENT_MODEL", "OPENAI_API_KEY", "OPENROUTER_API_KEY"])
    vi.stubEnv(key, "");
}

it("usa OpenAI y conserva las llamadas a herramientas", async () => {
  entorno();
  vi.stubEnv("OPENAI_API_KEY", "clave-de-prueba");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    id: "respuesta", object: "chat.completion", created: 0, model: "gpt-4.1-mini",
    choices: [{ index: 0, finish_reason: "tool_calls", message: {
      role: "assistant", content: null,
      tool_calls: [{ id: "llamada", type: "function", function: { name: "derivar_asesor", arguments: "{}" } }],
    } }],
  }), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  const client = getAgentClient();
  const result = await client.chat.completions.create({
    model: getAgentModel(), messages: [{ role: "user", content: "Quiero hablar con el equipo" }],
    tools: [{ type: "function", function: { name: "derivar_asesor", parameters: { type: "object", properties: {} } } }],
  });
  expect(getAgentProvider()).toBe("openai");
  expect(client.baseURL).toBe("https://api.openai.com/v1");
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(result.choices[0].message.tool_calls?.[0]).toMatchObject({ function: { name: "derivar_asesor" } });
});

it("no usa la clave de OpenRouter cuando se selecciona OpenAI", () => {
  entorno(); vi.stubEnv("AGENT_PROVIDER", "openai"); vi.stubEnv("OPENROUTER_API_KEY", "otra-clave");
  expect(hasAgentKey()).toBe(false);
  expect(agentKeyVariable()).toBe("OPENAI_API_KEY");
  expect(() => getAgentClient()).toThrow("OPENAI_API_KEY no configurada");
});

it("conserva OpenRouter y permite elegir el modelo", () => {
  entorno(); vi.stubEnv("OPENROUTER_API_KEY", "clave-de-prueba");
  expect(getAgentProvider()).toBe("openrouter");
  expect(hasAgentKey()).toBe(true);
  expect(getAgentClient().baseURL).toBe("https://openrouter.ai/api/v1");
  expect(getAgentModel()).toBe("google/gemini-2.5-flash");
  vi.stubEnv("AGENT_MODEL", "modelo-elegido");
  expect(getAgentModel()).toBe("modelo-elegido");
});

it("rechaza un proveedor desconocido", () => {
  entorno(); vi.stubEnv("AGENT_PROVIDER", "otro");
  expect(() => getAgentProvider()).toThrow("AGENT_PROVIDER");
});

it("apaga razonamiento en DeepSeek por OpenRouter sin alterar otros modelos", () => {
  entorno(); vi.stubEnv("AGENT_PROVIDER", "openrouter");
  expect(opcionesRazonamiento("deepseek/deepseek-v4.1-flash-1017")).toEqual({ reasoning: { enabled: false } });
  expect(opcionesRazonamiento("otro-modelo")).toEqual({});
  vi.stubEnv("AGENT_PROVIDER", "openai");
  expect(opcionesRazonamiento("deepseek/deepseek-v4.1-flash-1017")).toEqual({});
});
