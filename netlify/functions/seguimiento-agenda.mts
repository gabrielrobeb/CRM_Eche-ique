// Sin dependencias adicionales: Netlify inyecta estas variables al ejecutar la función.
declare const Netlify: { env: { get(name: string): string | undefined } };

export default async function seguimientoAgenda() {
  const base = Netlify.env.get("APP_BASE_URL") || Netlify.env.get("NEXT_PUBLIC_APP_URL");
  const secret = Netlify.env.get("AGENT_WORKER_SECRET");
  if (!base || !secret) throw new Error("Faltan APP_BASE_URL o AGENT_WORKER_SECRET para seguimiento de agenda");
  const res = await fetch(new URL("/api/agent/seguimiento-agenda", base), {
    headers: { "x-agent-secret": secret }, signal: AbortSignal.timeout(25_000), redirect: "error",
  });
  if (!res.ok) throw new Error(`Seguimiento de agenda: HTTP ${res.status}`);
  const result = await res.json();
  console.info("[seguimiento-agenda]", JSON.stringify(result));
}

// Barrido cada minuto: se envía a partir del minuto 30, sin depender de la zona horaria.
export const config = { schedule: "* * * * *" };
