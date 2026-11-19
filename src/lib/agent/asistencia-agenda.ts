export const DERIVACION_HORARIO = "Te voy a derivar con alguien del equipo para que revise si puede atenderte en otro horario.";
export const DERIVACION_AYUDA = "Te voy a derivar con alguien del equipo para que te ayude a agendar.";

/** Se añade también a prompts guardados en Ajustes, que podrían ser anteriores a estas reglas. */
export const REGLAS_ASISTENCIA_AGENDA = `# REGLAS ACTUALES DE AYUDA CON LA AGENDA
Si no puede en los horarios disponibles o no sabe agendar, deriva directamente con derivar_asesor y avisa que lo vas a derivar con alguien del equipo para revisar otro horario o ayudarle a agendar, según corresponda. No ofrezcas ayuda como pregunta ni pidas aceptación previa. No prometas disponibilidad, no sugieras reservar una hora incompatible y no minimices las dificultades tecnológicas. Si rechaza explícitamente la derivación, respeta su decisión. Una petición directa de atención humana o una urgencia conserva la derivación habitual.
La consulta inicial no se paga en cuotas: se paga completa antes de la reunión por transferencia. Al preguntar por cuotas explica que su valor se descuenta de los honorarios al contratar dentro de 15 días desde la entrega del diagnóstico escrito. No confundas cuotas de representación con cuotas de la consulta.
Enviar el enlace activa un único seguimiento para 30 minutos después. No preguntes inmediatamente si pudo agendar ni confirmes una reserva por enviar el enlace. Un "ya, listo" no confirma reserva: cierra brevemente sin repetir el enlace y conserva el seguimiento si no confirmó explícitamente que reservó. Si confirma reserva, rechaza continuar o es derivado, no insistas con el enlace ni el seguimiento.`;

export function respuestaCuotasConsulta(mensaje: string): string | null {
  const texto = normalizar(mensaje);
  if (!/\b(?:cuotas|cuota|pago fraccionado|pagar en partes)\b/.test(texto)
    || /\b(?:juicio|representacion|defensa|honorarios|causa completa|litis)\b/.test(texto)) return null;
  return "La consulta inicial no se paga en cuotas: se paga completa antes de la reunión, por transferencia. Si contratas dentro de 15 días desde la entrega del diagnóstico escrito, su valor se descuenta de los honorarios.";
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Una dificultad de horario o reserva deriva directamente; nunca simula el traspaso. */
export function asistenciaAgenda(mensaje: string):
  { respuesta: string; motivo: string } | null {
  const texto = normalizar(mensaje);
  // Las urgencias y peticiones directas de una persona se resuelven con las herramientas habituales.
  if (/\b(?:amenaz\w*|violencia|peligro|miedo|urgente|emergencia)\b|audiencia.{0,20}manana|\bquiero hablar con\b/.test(texto)) return null;
  if (/\bno (?:quiero|deseo|necesito)\b.{0,45}\b(?:deriv\w*|equipo|persona)\b/.test(texto)) return null;
  if (/\b(?:no puedo|no me sirven?|no me acomoda[n]?|no alcanzo)\b.{0,65}\b(?:horarios?|horas?|asistir)\b|\b(?:otro horario|otra hora|fuera de horario)\b/.test(texto)) {
    return { respuesta: DERIVACION_HORARIO, motivo: "No puede asistir en los horarios disponibles. El equipo debe revisar una alternativa según la disponibilidad indicada en el historial." };
  }
  if (/\b(?:no se|no puedo|no entiendo|no logro|no manejo|me cuesta)\b.{0,55}\b(?:agendar|reservar|tecnologia|tecnologico|formulario|enlace|link|internet|computador)\b/.test(texto)) {
    return { respuesta: DERIVACION_AYUDA, motivo: "Tiene dificultades para agendar y necesita que alguien del equipo le ayude con la reserva." };
  }
  return null;
}
