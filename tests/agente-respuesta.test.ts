import { describe, expect, it } from "vitest";
import { esquemaConfig } from "@/lib/config/schema";
import { formatearRespuesta, mensajeDeDerivacion } from "@/lib/agent/respuesta";

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
