import "server-only";
import { and, asc, desc, eq, gt, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookingFollowups, contacts, messages } from "@/db/schema";
import { getConfig } from "@/lib/config";
import { deliverMessage, getConversationRow } from "@/lib/channels/deliver";
import { isChannel, isOutsideFreeFormWindow } from "@/lib/channels/types";
import { getBookingUrl } from "./agenda";
import { getAgentConfig } from "./config";

export async function programarSeguimientoAgenda(conversationId: string, messageId: string, texto: string): Promise<void> {
  const config = getConfig().agente.agenda?.seguimiento;
  const enlace = getBookingUrl();
  if (!config || !enlace || enlace === "[LINK]" || !texto.includes(enlace)) return;
  const [mensaje] = await db.select().from(messages).where(and(
    eq(messages.id, messageId), eq(messages.conversationId, conversationId),
  )).limit(1);
  if (!mensaje || !["sent", "delivered", "read"].includes(mensaje.status) || mensaje.direction !== "out" || mensaje.origin !== "agent") return;
  const enviado = mensaje.sentAt ?? mensaje.createdAt;
  await db.insert(bookingFollowups).values({
    conversationId, linkMessageId: messageId,
    dueAt: new Date(enviado.getTime() + config.minutos * 60_000),
  }).onConflictDoNothing();
}
/** Cron persistente, sin temporizadores de 30 minutos dentro de una request. */
export async function procesarSeguimientosAgenda(ahora = new Date(), limite = 10) {
  // Un proceso interrumpido podría haber enviado antes de morir. No reintentar a ciegas.
  await db.update(bookingFollowups).set({ status: "failed", reason: "processing_interrupted_review_required", updatedAt: ahora })
    .where(and(eq(bookingFollowups.status, "processing"), lt(bookingFollowups.updatedAt, new Date(ahora.getTime() - 5 * 60_000))));
  const pendientes = await db.select().from(bookingFollowups)
    .where(and(eq(bookingFollowups.status, "pending"), lte(bookingFollowups.dueAt, ahora)))
    .orderBy(asc(bookingFollowups.dueAt)).limit(limite);
  const resultados: Array<{ conversationId: string; status: string; reason?: string }> = [];
  for (const pendiente of pendientes) {
    const [job] = await db.update(bookingFollowups).set({ status: "processing", updatedAt: ahora })
      .where(and(eq(bookingFollowups.conversationId, pendiente.conversationId), eq(bookingFollowups.status, "pending"))).returning();
    if (!job) continue; // Otro worker lo tomó.
    const terminar = async (status: string, reason?: string) => {
      await db.update(bookingFollowups).set({ status, reason: reason ?? null, updatedAt: ahora })
        .where(eq(bookingFollowups.conversationId, job.conversationId));
      resultados.push({ conversationId: job.conversationId, status, reason });
    };
    try {
      const config = getConfig().agente.agenda?.seguimiento;
      const conv = await getConversationRow(job.conversationId);
      if (!config || !conv?.contactId || !conv.aiEnabled || conv.needsHuman || conv.status !== "active") {
        await terminar("skipped", "conversation_unavailable"); continue;
      }
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, conv.contactId)).limit(1);
      if (!contact?.aiEnabled || contact.needsHuman) { await terminar("skipped", "contact_unavailable"); continue; }
      if (!isChannel(conv.channel) || !(await getAgentConfig(conv.channel)).enabled) {
        await terminar("skipped", "agent_disabled"); continue;
      }
      const campos = contact.customFields as Record<string, unknown>;
      if (config.estadosFinales.includes(String(campos[config.campoEstado] ?? ""))
        || campos.consulta_pagada === "No interesado" || campos.aceptacion_valor === "No aceptado") {
        await terminar("skipped", "booking_finished_or_declined"); continue;
      }
      const [enlace] = await db.select().from(messages).where(eq(messages.id, job.linkMessageId)).limit(1);
      if (!enlace) { await terminar("skipped", "link_missing"); continue; }
      const posteriores = await db.select().from(messages).where(and(
        eq(messages.conversationId, conv.id), gt(messages.createdAt, enlace.createdAt),
      )).orderBy(desc(messages.createdAt));
      if (posteriores.some((m) => m.direction === "out" && m.origin === "human" && m.status !== "failed")
        || posteriores.some((m) => m.direction === "in" && reservaConfirmada(m.body ?? ""))) {
        await terminar("skipped", "human_attention_or_booking_confirmed"); continue;
      }
      // No interrumpir una respuesta en curso; se vuelve a evaluar en el próximo cron.
      if (posteriores[0]?.direction === "in" || (conv.lastMessageAt && ahora.getTime() - conv.lastMessageAt.getTime() < 60_000)) {
        await terminar("pending", "conversation_in_progress"); continue;
      }
      if (conv.provider !== "simulador" && isOutsideFreeFormWindow(conv.channel, conv.lastInboundAt, ahora)) {
        await terminar("skipped", "free_form_window_closed"); continue;
      }
      const entrega = await deliverMessage(conv.id, { text: config.mensaje }, "agent");
      await terminar(entrega.ok ? "sent" : "failed", entrega.error);
    } catch (error) {
      await terminar("failed", error instanceof Error ? error.message : "unknown");
    }
  }
  return resultados;
}

/** Solo confirmaciones inequívocas; «ya, listo» o «quiero agendar» no prueban reserva. */
export function reservaConfirmada(texto: string): boolean {
  const t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:no|todavia|aun|quiero|puedo|podria|como)\b|\?/.test(t)) return false;
  return /\b(?:ya (?:agende|reserve)|(?:tengo|quedo|esta) (?:la |mi )?(?:cita|hora|reserva) (?:agendada|reservada|confirmada))\b/.test(t);
}
