/** URL publica configurada por el negocio, nunca generada por el modelo. */
export function getBookingUrl(): string | null {
  const value = process.env.AGENDA_URL?.trim();
  if (!value) return null;
  if (value === "[LINK]") return value; // Marcador de pruebas autorizado por el negocio.
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
