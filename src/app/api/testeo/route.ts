import { NextRequest, NextResponse } from "next/server";
import { moduloActivo } from "@/lib/config";
import { listMembers } from "@/lib/team";
import { crearConversacionSimulada, enviarMensajeSimulado } from "@/lib/simulador";
import { firmarTesteo, validarTesteo } from "@/lib/testeo-token";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!moduloActivo("simulador") || typeof body?.token !== "string" || !validarTesteo(body.token, "acceso")) {
    return NextResponse.json({ error: "El enlace no es válido o ha vencido. Solicita uno nuevo." }, { status: 403 });
  }
  if (body.action === "crear") {
    const member = (await listMembers({ onlyActive: true })).find((m) => m.role === "admin");
    if (!member) return NextResponse.json({ error: "El testeo no está disponible." }, { status: 503 });
    const { conversationId } = await crearConversacionSimulada({ canal: "whatsapp", nombre: "Prueba de cliente", member });
    return NextResponse.json({ conversationId, session: firmarTesteo(`conversacion:${conversationId}`) });
  }
  if (typeof body.conversationId !== "string" || typeof body.session !== "string" || !validarTesteo(body.session, `conversacion:${body.conversationId}`)) {
    return NextResponse.json({ error: "Inicia una nueva conversación." }, { status: 403 });
  }
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  if (!texto || texto.length > 4000) return NextResponse.json({ error: "Escribe un mensaje de hasta 4000 caracteres." }, { status: 400 });
  const result = await enviarMensajeSimulado({ conversationId: body.conversationId, texto });
  if ("error" in result) return NextResponse.json({ error: "No se pudo encontrar la conversación." }, { status: 404 });
  return NextResponse.json({ messages: result.messages.map(({ id, direction, body }) => ({ id, direction, body })), responded: result.agente.ok });
}
