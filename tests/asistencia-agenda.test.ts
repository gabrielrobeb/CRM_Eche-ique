import { expect, it } from "vitest";
import { asistenciaAgenda, DERIVACION_AYUDA, DERIVACION_HORARIO, respuestaCuotasConsulta } from "@/lib/agent/asistencia-agenda";

it("deriva directamente para revisar otro horario sin prometer una reserva", () => {
  expect(asistenciaAgenda("Es que no puedo a esas horas. Salgo a las 20 hrs de la pega"))
    .toMatchObject({ respuesta: DERIVACION_HORARIO, motivo: expect.stringContaining("horarios disponibles") });
});

it("deriva ante dificultades tecnológicas sin pedir aceptación ni confundir otras consultas", () => {
  expect(asistenciaAgenda("Es que no manejo mucho tecnología"))
    .toMatchObject({ respuesta: DERIVACION_AYUDA, motivo: expect.stringContaining("dificultades para agendar") });
  expect(asistenciaAgenda("No sé agendar, pero no quiero que me deriven")).toBeNull();
  expect(asistenciaAgenda("Sí")).toBeNull();
  expect(asistenciaAgenda("¿Cuánto cuesta?")).toBeNull();
});

it("no bloquea una urgencia con una oferta de ayuda comercial", () => {
  expect(asistenciaAgenda("Me amenazó, tengo miedo y no puedo asistir a esas horas")).toBeNull();
});

it("distingue cuotas de consulta de representación y explica el descuento", () => {
  expect(respuestaCuotasConsulta("¿Dan cuotas para pagar? jamás he ido a una consulta"))
    .toMatch(/no se paga en cuotas[\s\S]*15 días[\s\S]*entrega del diagnóstico escrito[\s\S]*descuenta/);
  expect(respuestaCuotasConsulta("¿Se puede pagar en cuotas el juicio?")).toBeNull();
  expect(respuestaCuotasConsulta("¿Cuánto cuesta la reunión?")).toBeNull();
  expect(respuestaCuotasConsulta("¿Trabajan con cuota litis?")).toBeNull();
});
