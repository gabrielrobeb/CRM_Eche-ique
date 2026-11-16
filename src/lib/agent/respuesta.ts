import type { ConfigCliente } from "@/lib/config/schema";

export function mensajeDeDerivacion(agente: ConfigCliente["agente"], tipo: unknown): string {
  if (tipo === "riesgo_personal" || tipo === "plazo_proximo") {
    return agente.mensajesDerivacion?.[tipo] ?? agente.mensajeDerivacion;
  }
  return agente.mensajeDerivacion;
}

/** WhatsApp usa un asterisco; no cortar respuestas ni alterar su contenido. */
export function formatearRespuesta(texto: string, canal: string): string {
  return canal === "whatsapp" ? texto.replace(/\*\*([^*\n]+)\*\*/g, "*$1*") : texto;
}
