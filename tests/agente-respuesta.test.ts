import { describe, expect, it } from "vitest";
import { esquemaConfig } from "@/lib/config/schema";
import { evitarAceptacionRepetida, formatearRespuesta, mensajeDeDerivacion, respuestaParaAgendar, solicitaAgendar, yaPreguntoAceptacion } from "@/lib/agent/respuesta";

const agente = esquemaConfig.parse({
  marca: { nombre: "Prueba", nombreCorto: "Prueba" },
  pipeline: { etapas: [{ clave: "nuevo", nombre: "Nuevo" }, { clave: "fin", nombre: "Fin" }] },
  agente: { mensajeDerivacion: "General", mensajesDerivacion: { riesgo_personal: "Llama al 133", plazo_proximo: "Solicitud urgente" } },
}).agente;

describe("respuestas de derivación", () => {
  it("no sustituye un aviso de peligro o plazo por el mensaje genérico", () => {
    expect(mensajeDeDerivacion(agente, "riesgo_personal")).toBe("Llama al 133");
    expect(mensajeDeDerivacion(agente, "plazo_proximo")).toBe("Solicitud urgente");
    expect(mensajeDeDerivacion(agente, "general")).toBe("General");
    expect(mensajeDeDerivacion(agente, "inexistente")).toBe("General");
  });

  it("mantiene compatibilidad con clientes sin avisos específicos", () => {
    expect(mensajeDeDerivacion({ ...agente, mensajesDerivacion: undefined }, "riesgo_personal")).toBe("General");
  });
});

it("adapta negrita a WhatsApp sin cortar el texto ni cambiar enlaces", () => {
  const texto = "Consulta **$50.000 CLP**. Más en https://ejemplo.cl/a_b.\nSin **garantías**.";
  expect(formatearRespuesta(texto, "whatsapp")).toBe("Consulta *$50.000 CLP*. Más en https://ejemplo.cl/a_b.\nSin *garantías*.");
  expect(formatearRespuesta(texto, "instagram")).toBe(texto);
});

it("detecta preguntas de aceptación con montos que contienen puntos", () => {
  const historial = [{ role: "assistant", content: "Cuesta $50.000 CLP. ¿Aceptas ese valor?" }];
  expect(yaPreguntoAceptacion(historial)).toBe(true);
  expect(evitarAceptacionRepetida("La atención es online. ¿Aceptas el valor de $50.000 CLP?", historial)).toBe("La atención es online.");
  expect(evitarAceptacionRepetida("Cuesta $50.000 CLP. ¿Qué documento tienes?", historial)).toBe("Cuesta $50.000 CLP. ¿Qué documento tienes?");
  expect(evitarAceptacionRepetida("¿Aceptas ese valor?", [])).toBe("¿Te gustaría avanzar con el proceso y agendar?");
  expect(yaPreguntoAceptacion([{ role: "user", content: "¿Aceptas ese precio?" }])).toBe(false);
});

it("conserva la propuesta de diagnóstico y no repite la invitación de agenda", () => {
  const propuesta = "Revisaremos tus antecedentes y opciones. Tiene un valor de $50.000 CLP. ¿Te gustaría avanzar con el proceso y agendar?";
  expect(evitarAceptacionRepetida(propuesta, [])).toBe(propuesta);
  expect(evitarAceptacionRepetida("La reunión es online. ¿Te gustaría avanzar con el proceso y agendar?", [{ role: "assistant", content: propuesta }])).toBe("La reunión es online.");
  expect(evitarAceptacionRepetida("Tiene un valor de $70.000 CLP. ¿Aceptas ese valor?", [])).toBe("Tiene un valor de $70.000 CLP. ¿Te gustaría avanzar con el proceso y agendar?");
  expect(evitarAceptacionRepetida("Revisamos tus antecedentes. Tiene un valor de $50.000 CLP. Aceptas ese valor?", [])).toBe("Revisamos tus antecedentes. Tiene un valor de $50.000 CLP. ¿Te gustaría avanzar con el proceso y agendar?");
});

it("no elimina una pregunta sobre notificaciones ni entrega un mensaje vacío", () => {
  const historial = [{ role: "assistant", content: "¿Aceptas ese valor?" }];
  expect(evitarAceptacionRepetida("", historial)).toBe("");
  expect(evitarAceptacionRepetida("¿Aceptaste recibir notificaciones?", historial)).toBe("¿Aceptaste recibir notificaciones?");
  expect(evitarAceptacionRepetida("¿Aceptas el precio de $50.000?", historial)).toBe("Puedo aclarar tus dudas sobre lo que te comenté.");
});

it("envía el enlace exacto sin documentos ni validación humana al pedir agenda", () => {
  const input = { mensaje: "Sí, quiero agendar, mándame el enlace.", area: "Penal", tarifas: { Penal: 70000, Civil: 50000 }, enlace: "https://echeniqueabogados.site/#agenda", historial: [{ role: "assistant", content: "La consulta penal cuesta $70.000 CLP." }] };
  expect(respuestaParaAgendar(input)).toBe("Puedes elegir tu hora aquí: https://echeniqueabogados.site/#agenda");
  expect(respuestaParaAgendar({ ...input, historial: [] })).toContain("$70.000 CLP");
  expect(respuestaParaAgendar({ ...input, area: "Laboral" })).toBeNull();
  expect(respuestaParaAgendar({ ...input, enlace: null })).toBeNull();
  expect(respuestaParaAgendar({ ...input, mensaje: "No quiero agendar todavía" })).toBeNull();
  expect(respuestaParaAgendar({ ...input, mensaje: "Quiero agendar aunque no tengo documentos" })).toContain("No necesitas tener los documentos");
  expect(solicitaAgendar("¿Cuánto cuesta la reunión?")).toBe(false);
  const invitacion = [{ role: "assistant", content: "Tiene un valor de $50.000 CLP. ¿Te gustaría avanzar y agendar?" }];
  expect(solicitaAgendar("Sí, gracias", invitacion)).toBe(true);
  expect(solicitaAgendar("Sí tengo documentos", invitacion)).toBe(false);
  expect(solicitaAgendar("Sí", [{ role: "assistant", content: "¿Tienes documentos?" }])).toBe(false);
});
