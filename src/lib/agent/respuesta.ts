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

type Turno = { role: string; content: string };
const preguntas = /¿[^?\n]*\?|(?:^|\n)[^¿?\n]*\?/g;
function esAceptacion(pregunta: string): boolean {
  const texto = pregunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(?:aceptas?|aceptan|aceptarias?|te parece|estas de acuerdo|confirmas)\b/.test(texto)
    && (/\b(?:valor|precio|tarifa|monto|consulta pagada)\b|\$/.test(texto) || /^¿?\s*aceptas?\s*\?$/.test(texto));
}

export function yaPreguntoAceptacion(historial: Turno[]): boolean {
  return historial.some((turno) => turno.role === "assistant"
    && (turno.content.match(preguntas) ?? []).some(esAceptacion));
}

/** Quitar solo el cierre repetido; conservar la respuesta a la duda y los precios. */
export function evitarAceptacionRepetida(texto: string, historial: Turno[]): string {
  if (!yaPreguntoAceptacion(historial)) return texto;
  return texto.replace(preguntas, (pregunta) => esAceptacion(pregunta) ? "" : pregunta).trim()
    || "Puedo aclarar tus dudas sobre lo que te comenté.";
}
