export type DerivacionUrgente = { tipo: "riesgo_personal" | "plazo_proximo"; motivo: string };

/** Estos casos no dependen de que el modelo decida llamar una herramienta. */
export function detectarUrgencia(mensaje: string): DerivacionUrgente | null {
  const texto = mensaje.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const clausulas = texto.split(/[.!?;\n]+/).filter(Boolean);
  for (const clausula of clausulas) {
    const afirmacion = clausula.replace(/\b(?:no hay|sin) (?:riesgo|peligro|violencia|amenazas)\b/g, "")
      .replace(/\bno (?:estoy|estamos|esta|estan) en peligro\b/g, "")
      .replace(/\bno (?:me |nos )?(?:(?:ha|han|habia) )?(?:amenaz\w*|agredi\w*|golpe\w*)[^,]*/g, "");
    const amenazaFisica = /\bamenaz\w*\b/.test(afirmacion)
      && /\b(?:hacer(?:me|nos|le)? dano|mat\w*|muerte|golpe\w*|pegar\w*|agredi\w*|violencia|integridad|vida|seguridad)\b/.test(afirmacion);
    const peligroExplicito = /\b(?:estoy|estamos|esta|estan) en peligro\b|\b(?:mi|nuestra) (?:vida|seguridad|integridad) (?:esta|corre) (?:en )?riesgo\b|\b(?:me|nos) (?:golpeo|agredio|esta golpeando|esta agrediendo)\b/.test(afirmacion);
    if (amenazaFisica || peligroExplicito) {
      return { tipo: "riesgo_personal", motivo: "La persona comunica amenazas de daño o peligro para su seguridad; requiere atención humana prioritaria." };
    }
  }
  for (const clausula of clausulas) {
    const afirmacion = clausula.replace(/\bno (?:tengo|tenemos|hay|habra) (?:una? )?(?:audiencia|plazo|citacion)\b[^,]*/g, "");
    if (/\b(?:audiencia|plazo|citacion)\b/.test(afirmacion)
      && /\b(?:manana|hoy|esta tarde|esta noche|en (?:unas?|pocas?) horas)\b/.test(afirmacion)) {
      return { tipo: "plazo_proximo", motivo: "La persona indica una audiencia, citación o plazo hoy o mañana; requiere revisión humana prioritaria." };
    }
  }
  return null;
}
