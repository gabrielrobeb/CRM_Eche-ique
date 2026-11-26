import { expect, it } from "vitest";
import { detectarUrgencia } from "@/lib/agent/urgencias";

it.each([
  "Mi expareja me amenazó con hacerme daño hoy y tengo miedo. ¿Debo esperar a pagar una consulta?",
  "Mi ex me amenazó con hacerme daño y tengo miedo de ir a la audiencia",
  "Estoy en peligro, necesito hablar con alguien",
  "Me agredió mi pareja",
])("prioriza seguridad personal: %s", (texto) => {
  expect(detectarUrgencia(texto)?.tipo).toBe("riesgo_personal");
});

it.each([
  "Tengo una audiencia mañana a las 9 y no tengo abogado. ¿Me aseguran representación y que pueden suspenderla?",
  "Tengo audiencia mañana a las 9 y no tengo abogado, ¿pueden representarme?",
  "Mañana tengo audiencia por cuidado personal",
  "El plazo vence hoy",
])("deriva el plazo próximo sin seguir calificando: %s", (texto) => {
  expect(detectarUrgencia(texto)?.tipo).toBe("plazo_proximo");
});

it.each([
  "No hay riesgo ni audiencia. Quiero saber el precio",
  "No estoy en peligro, solo quiero orientación",
  "Sin peligro ni violencia, quiero una consulta penal",
  "No tengo audiencia mañana, solo quiero saber el precio",
  "No me ha amenazado ni agredido",
  "Me amenazó con demandarme por un contrato",
  "Tengo audiencia en tres semanas",
  "Quiero ayuda esta semana",
])("no inventa una emergencia: %s", (texto) => {
  expect(detectarUrgencia(texto)).toBeNull();
});

it("prioriza el peligro personal sobre una audiencia cercana", () => {
  expect(detectarUrgencia("Tengo audiencia mañana. Mi ex me amenazó con matarme.")?.tipo).toBe("riesgo_personal");
});
