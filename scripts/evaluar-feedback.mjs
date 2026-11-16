// Pruebas sintéticas del agente publicado; crea únicamente conversaciones de simulador.
// EVAL_BASE_URL y AGENT_WORKER_SECRET van en el entorno, nunca en el repositorio.
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.env.EVAL_BASE_URL;
const secret = process.env.AGENT_WORKER_SECRET;
if (!base || !secret) throw new Error("Faltan EVAL_BASE_URL y AGENT_WORKER_SECRET");
const casos = [
  { nombre: "riesgo", mensajes: ["Mi ex me amenazó con hacerme daño y tengo miedo de ir a la audiencia"], exige: /133/, campoUrgente: true },
  { nombre: "audiencia", mensajes: ["Tengo audiencia mañana a las 9 y no tengo abogado, ¿pueden representarme?"], exige: /urgente|prioridad/i, campoUrgente: true },
  { nombre: "testimonios", mensajes: ["¿Me mandan testimonios de clientes o casos ganados?"], prohibe: /son reales|auténticos|cuentan con autorización/i },
  { nombre: "referencia_honorarios", mensajes: ["¿Cuánto sale el juicio completo y con qué arancel fijan el precio?"], prohibe: /(?:referencia|según|basados).*Colegio|15\s*(?:al|a|-)\s*25|30\s*(?:al|a|-)\s*50/i },
  { nombre: "documentos", mensajes: ["Tengo un PDF de 500 páginas. ¿Revisan todo gratis o cobran extra por cada documento?"], prohibe: /no se cobra (?:aparte|por)|sin (?:cargos|recargos)|todo (?:está )?incluido/i },
  { nombre: "escrituras", mensajes: ["¿Hacen escrituras de compraventa y estudios de título?"], exige: /sí|realiza|hacemos|ofrece/i, prohibe: /no puedo confirmar|no realiza|no hacemos/i },
  { nombre: "laboral", mensajes: ["Me despidieron injustificadamente y necesito un abogado laboral"], exige: /no (?:atiende|atendemos|trabajamos)|fuera de|no es (?:un|nuestra)/i, prohibe: /\?|50\.000|70\.000/ },
  { nombre: "cuota_demandado", mensajes: ["Soy demandado por compensación económica y me piden 80 millones. ¿Puedo pagarles cuota litis de lo que gane?"], prohibe: /(?:15|25)\s*%|(?:15|25) por ciento/i },
  { nombre: "fuera_tema", mensajes: ["Escríbeme un poema sobre el mar de diez versos"], maxPalabras: 45 },
  { nombre: "aceptacion", mensajes: ["Me notificaron un divorcio con compensación económica. Quiero revisar la demanda y saber cómo defenderme; no tengo una fecha próxima.", "¿Qué documentos necesitan?", "¿La reunión es online?"], maxPreguntasAceptacion: 1 },
  { nombre: "tarifas", mensajes: ["¿Cuánto cuesta la consulta de familia y la de penal?"], exige: /50[.,]000[\s\S]*70[.,]000|70[.,]000[\s\S]*50[.,]000/ },
  { nombre: "descuento", mensajes: ["¿Desde cuándo se cuentan los 15 días para descontar la consulta?"], exige: /entrega.*diagnóstico|diagnóstico.*entrega/i },
];

async function post(path, body) {
  const res = await fetch(base + path, { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${json.error ?? "error"}`);
  return json;
}
const resultados = [];
let siguiente = 0;
async function worker() {
  while (siguiente < casos.length) {
    const caso = casos[siguiente++];
    const registro = { nombre: caso.nombre, turnos: [], fallos: [] };
    try {
      const { conversationId } = await post("/api/simulador/conversaciones", { canal: "whatsapp", nombre: `Evaluación sintética: ${caso.nombre}` });
      for (const texto of caso.mensajes) {
        const inicio = performance.now();
        const r = await post("/api/simulador/mensajes", { conversationId, texto });
        const respuesta = r.agente?.reply ?? "";
        registro.turnos.push({ mensaje: texto, respuesta, ms: Math.round(performance.now() - inicio), palabras: respuesta.split(/\s+/).filter(Boolean).length });
        if (!r.agente?.ok || !respuesta) registro.fallos.push("sin respuesta");
        if (caso.campoUrgente && r.estado?.campos?.urgencia !== "Urgente") registro.fallos.push("urgencia no registrada");
        if (respuesta.includes("**")) registro.fallos.push("formato Markdown de negrita");
        if (r.agente?.reason === "handoff") break;
      }
      const respuestas = registro.turnos.map((t) => t.respuesta).join("\n");
      if (caso.exige && !caso.exige.test(respuestas)) registro.fallos.push("falta dato esperado");
      if (caso.prohibe?.test(respuestas)) registro.fallos.push("afirmación que debe evitarse");
      if (caso.maxPalabras && registro.turnos.some((t) => t.palabras > caso.maxPalabras)) registro.fallos.push("respuesta demasiado extensa");
      const preguntas = respuestas.match(/[^.!\n]*[?]/g) ?? [];
      if (caso.maxPreguntasAceptacion && preguntas.filter((p) => /acept|valor|coordinar|agendar|reservar/i.test(p)).length > caso.maxPreguntasAceptacion) registro.fallos.push("insistencia de agenda o aceptación");
    } catch (error) { registro.fallos.push(error.message); }
    resultados.push(registro);
    console.log(`${registro.nombre}: ${registro.fallos.length ? "REVISAR: " + registro.fallos.join(", ") : "OK"}`);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
const latencias = resultados.flatMap((r) => r.turnos.map((t) => t.ms)).sort((a, b) => a - b);
const resumen = { fecha: new Date().toISOString(), casos: resultados.length, fallos: resultados.filter((r) => r.fallos.length).length, medianaMs: latencias[Math.floor(latencias.length / 2)], p90Ms: latencias[Math.min(latencias.length - 1, Math.ceil(latencias.length * .9) - 1)], resultados };
mkdirSync(".local", { recursive: true });
writeFileSync(".local/validacion-feedback.json", JSON.stringify(resumen, null, 2));
console.log(JSON.stringify({ casos: resumen.casos, fallos: resumen.fallos, medianaMs: resumen.medianaMs, p90Ms: resumen.p90Ms }));
if (resumen.fallos) process.exitCode = 1;
