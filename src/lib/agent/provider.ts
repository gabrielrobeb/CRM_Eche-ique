import OpenAI from "openai";
import { getConfig, marca } from "@/lib/config";

export type AgentProvider = "openai" | "openrouter";

/** Ajuste explícito solo para el modelo verificado; no forzarlo en modelos obligatorios. */
export function opcionesRazonamiento(model: string) {
  return getAgentProvider() === "openrouter" && model === "deepseek/deepseek-v4.1-flash-1017"
    ? { reasoning: { enabled: false } } : {};
}

export function getAgentProvider(): AgentProvider {
  const explicit = process.env.AGENT_PROVIDER?.trim();
  if (explicit && explicit !== "openai" && explicit !== "openrouter") {
    throw new Error("AGENT_PROVIDER debe ser openai u openrouter");
  }
  if (explicit === "openai" || explicit === "openrouter") return explicit;
  return process.env.OPENAI_API_KEY?.trim() ? "openai" : "openrouter";
}

export function agentKeyVariable(): "OPENAI_API_KEY" | "OPENROUTER_API_KEY" {
  return getAgentProvider() === "openai" ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY";
}

export function hasAgentKey(): boolean {
  return Boolean(process.env[agentKeyVariable()]?.trim());
}

export function getAgentClient(): OpenAI {
  const provider = getAgentProvider();
  const keyName = agentKeyVariable();
  const apiKey = process.env[keyName]?.trim();
  if (!apiKey) throw new Error(`${keyName} no configurada`);
  return new OpenAI({
    apiKey,
    baseURL: provider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1",
    ...(provider === "openrouter" ? {
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_BASE_URL || "http://localhost:3000",
        "X-Title": marca().nombre,
      },
    } : {}),
  });
}

export function getAgentModel(): string {
  const model = process.env.AGENT_MODEL?.trim() || getConfig().agente.modelo?.trim();
  return model || (getAgentProvider() === "openai" ? "gpt-4.1-mini" : "google/gemini-2.5-flash");
}
