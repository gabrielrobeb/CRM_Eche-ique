import { createHmac, timingSafeEqual } from "node:crypto";

function secreto() {
  const value = process.env.AGENT_WORKER_SECRET;
  if (!value) throw new Error("Configura AGENT_WORKER_SECRET para compartir el testeo.");
  return value;
}

export function firmarTesteo(scope: string, expires = Date.now() + 7 * 86400000) {
  const payload = Buffer.from(JSON.stringify({ scope, expires })).toString("base64url");
  return `${payload}.${createHmac("sha256", secreto()).update(payload).digest("base64url")}`;
}

export function validarTesteo(token: string, scope: string) {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return false;
    const expected = createHmac("sha256", secreto()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.scope === scope && typeof data.expires === "number" && data.expires > Date.now();
  } catch {
    return false;
  }
}
