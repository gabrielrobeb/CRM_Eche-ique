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
const preguntas = /¿[^?\n]*\?|(?:^|(?<=[.!]\s)|\n)(?:[^¿?\n.!]|\.(?=\d))*\?/g;
function esAceptacion(pregunta: string): boolean {
  const texto = pregunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return (/\b(?:agendar|reservar|coordinar (?:la|una) (?:reunion|consulta))\b/.test(texto)
    && /\b(?:gustaria|quieres?|deseas?|avanzar|te parece)\b/.test(texto))
    || esAprobacionDePrecio(texto);
}

function esAprobacionDePrecio(texto: string): boolean {
  return /\b(?:aceptas?|aceptan|aceptarias?|te parece|estas de acuerdo|confirmas)\b/.test(texto)
    && (/\b(?:valor|precio|tarifa|monto|consulta pagada)\b|\$/.test(texto) || /^¿?\s*aceptas?\s*\?$/.test(texto));
}

export function yaPreguntoAceptacion(historial: Turno[]): boolean {
  return historial.some((turno) => turno.role === "assistant"
    && (turno.content.match(preguntas) ?? []).some(esAceptacion));
}

/** Quitar solo el cierre repetido; conservar la respuesta a la duda y los precios. */
export function evitarAceptacionRepetida(texto: string, historial: Turno[]): string {
  if (!texto.trim()) return texto;
  if (!yaPreguntoAceptacion(historial)) {
    return texto.replace(preguntas, (pregunta) => esAprobacionDePrecio(pregunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
      ? "¿Te gustaría avanzar con el proceso y agendar?" : pregunta);
  }
  return texto.replace(preguntas, (pregunta) => esAceptacion(pregunta) ? "" : pregunta).trim()
    || "Puedo aclarar tus dudas sobre lo que te comenté.";
}

export function solicitaAgendar(texto: string, historial: Turno[] = []): boolean {
  const t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:no quiero|no deseo|no me gustaria|no voy a|todavia no|antes de agendar|sin agendar)\b/.test(t)) return false;
  const anterior = historial.findLast((turno) => turno.role === "assistant");
  if (/^(?:si|dale|de acuerdo|me parece bien|hagamoslo|vamos)(?:[,.! ]*(?:gracias|por favor|hagamoslo|me sirve))*[.! ]*$/.test(t.trim())
    && anterior && (anterior.content.match(preguntas) ?? []).some(esAceptacion)) return true;
  return /\b(?:quiero|quisiera|me gustaria|vamos a|puedo|podemos)\b[^.!?\n]{0,65}\b(?:agendar|reservar)\b/.test(t)
    || /\b(?:manda(?:me)?|envia(?:me)?|pasa(?:me)?|dame)\b[^.!?\n]{0,40}\b(?:enlace|link)\b/.test(t);
}

/** Cierre comercial determinista: datos confirmados, nunca una reserva ficticia. */
export function respuestaParaAgendar(input: {
  mensaje: string; area: unknown; tarifas: Record<string, number>; enlace: string | null; historial: Turno[];
}): string | null {
  if (!solicitaAgendar(input.mensaje, input.historial) || !input.enlace || input.enlace === "[LINK]"
    || typeof input.area !== "string" || !Object.hasOwn(input.tarifas, input.area)) return null;
  const tarifa = input.tarifas[input.area];
  const precio = `$${tarifa.toLocaleString("es-CL")} CLP`;
  const patronPrecio = new RegExp(String(tarifa).split("").join("[., ]?"));
  const informado = input.historial.some((t) => t.role === "assistant" && patronPrecio.test(t.content));
  const introduccion = informado ? "" : `En la reunión de diagnóstico revisamos tus antecedentes, aclaramos tus dudas y evaluamos cómo avanzar. Tiene un valor de ${precio}. `;
  const documentos = /document/i.test(input.mensaje) ? " No necesitas tener los documentos para reservar." : "";
  return `${introduccion}Puedes elegir tu hora aquí: ${input.enlace}${documentos}`;
}
