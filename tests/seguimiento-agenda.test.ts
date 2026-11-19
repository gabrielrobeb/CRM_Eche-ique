import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { readFileSync } from "node:fs";
import { bookingFollowups, contacts, conversations, messages } from "@/db/schema";

const state = vi.hoisted(() => ({ db: null as unknown as ReturnType<typeof drizzle>, deliver: vi.fn(), conversation: vi.fn() }));
vi.mock("@/db", () => ({ get db() { return state.db; } }));
vi.mock("@/lib/config", () => ({ getConfig: () => ({ agente: { agenda: { seguimiento: {
  minutos: 30, mensaje: "¿Pudiste agendar tu consulta?", campoEstado: "estado_cita", estadosFinales: ["Agendada", "Realizada", "Cancelada"],
} } } }) }));
vi.mock("@/lib/channels/deliver", () => ({ deliverMessage: state.deliver, getConversationRow: state.conversation }));
vi.mock("@/lib/agent/config", () => ({ getAgentConfig: async () => ({ enabled: true }) }));
import { procesarSeguimientosAgenda, programarSeguimientoAgenda, reservaConfirmada } from "@/lib/agent/seguimiento-agenda";

const inicio = new Date("2026-11-19T14:00:00Z");
const despues = (minutos: number) => new Date(inicio.getTime() + minutos * 60_000);
let pg: PGlite;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("AGENDA_URL", "https://agenda.example/consulta");
  pg = new PGlite();
  state.db = drizzle(pg);
  // Tablas de soporte con las columnas reales; la cola se crea con la migración entregada.
  for (const table of [contacts, conversations, messages]) {
    const config = getTableConfig(table);
    await pg.exec(`create table "${config.name}" (${config.columns.map((c) => `"${c.name}" ${c.getSQLType()}${c.name === "id" ? " primary key" : ""}`).join(", ")})`);
  }
  await pg.exec("create role anon; create role authenticated;");
  await pg.exec(readFileSync("supabase/migrations/20261119000000_seguimiento_agenda.sql", "utf8"));
  await state.db.insert(contacts).values({ id: "contacto", name: "Prueba", aiEnabled: true, needsHuman: false, customFields: {} });
  await state.db.insert(conversations).values({ id: "hilo", contactId: "contacto", externalId: "sim:test", channel: "whatsapp", provider: "simulador", status: "active", aiEnabled: true, needsHuman: false, lastInboundAt: inicio, lastMessageAt: inicio });
  await state.db.insert(messages).values({ id: "enlace", conversationId: "hilo", contactId: "contacto", direction: "out", origin: "agent", status: "sent", body: "https://agenda.example/consulta", sentAt: inicio, createdAt: inicio });
  state.conversation.mockImplementation(async () => (await state.db.select().from(conversations).where(eq(conversations.id, "hilo")))[0]);
  state.deliver.mockResolvedValue({ ok: true, messageId: "seguimiento" });
});

afterEach(async () => { vi.unstubAllEnvs(); await pg?.close(); });

const programar = () => programarSeguimientoAgenda("hilo", "enlace", "Puedes elegir tu hora aquí: https://agenda.example/consulta");

it("persiste el vencimiento a 30 minutos, no adelanta el envío ni duplica al reenviar enlace o ejecutar dos workers", async () => {
  await programar(); await programar();
  expect((await state.db.select().from(bookingFollowups))).toHaveLength(1);
  expect((await state.db.select().from(bookingFollowups))[0].dueAt).toEqual(despues(30));
  await procesarSeguimientosAgenda(despues(29));
  expect(state.deliver).not.toHaveBeenCalled();
  await Promise.all([procesarSeguimientosAgenda(despues(30)), procesarSeguimientosAgenda(despues(30))]);
  expect(state.deliver).toHaveBeenCalledTimes(1);
  expect(state.deliver).toHaveBeenCalledWith("hilo", { text: "¿Pudiste agendar tu consulta?" }, "agent");
  await programar(); await procesarSeguimientosAgenda(despues(60));
  expect(state.deliver).toHaveBeenCalledTimes(1);
});

it.each(["Agendada", "Realizada", "Cancelada"])("omite el seguimiento cuando la ficha dice %s", async (estado) => {
  await programar();
  await state.db.update(contacts).set({ customFields: { estado_cita: estado } });
  await procesarSeguimientosAgenda(despues(30));
  expect(state.deliver).not.toHaveBeenCalled();
  expect((await state.db.select().from(bookingFollowups))[0].status).toBe("skipped");
});

it.each(["derivado", "pausado", "rechazado", "reserva", "humano", "ventana_cerrada"])("cancela ante %s", async (caso) => {
  await programar();
  if (caso === "derivado") await state.db.update(conversations).set({ needsHuman: true });
  if (caso === "pausado") await state.db.update(contacts).set({ aiEnabled: false });
  if (caso === "rechazado") await state.db.update(contacts).set({ customFields: { consulta_pagada: "No interesado" } });
  if (caso === "ventana_cerrada") await state.db.update(conversations).set({ provider: "zernio", lastInboundAt: new Date(inicio.getTime() - 25 * 3600_000) });
  if (caso === "reserva" || caso === "humano") await state.db.insert(messages).values({
    id: "posterior", conversationId: "hilo", direction: caso === "reserva" ? "in" : "out", origin: caso === "humano" ? "human" : null,
    body: caso === "reserva" ? "Sí, ya agendé. Gracias" : "El equipo te ayuda", status: "sent", createdAt: despues(5),
  });
  await procesarSeguimientosAgenda(despues(30));
  expect(state.deliver).not.toHaveBeenCalled();
});

it("no programa enlaces que fallaron, marcadores ni mensajes ajenos al hilo", async () => {
  await state.db.update(messages).set({ status: "failed" }); await programar();
  await state.db.update(messages).set({ status: "sent" });
  await programarSeguimientoAgenda("otro", "enlace", "https://agenda.example/consulta");
  vi.stubEnv("AGENDA_URL", "[LINK]");
  await programarSeguimientoAgenda("hilo", "enlace", "[LINK]");
  expect(await state.db.select().from(bookingFollowups)).toHaveLength(0);
});

it("un fallo de envío queda visible y no se reintenta con riesgo de duplicar", async () => {
  await programar(); state.deliver.mockResolvedValue({ ok: false, error: "Proveedor no disponible" });
  await procesarSeguimientosAgenda(despues(30)); await procesarSeguimientosAgenda(despues(31));
  expect(state.deliver).toHaveBeenCalledTimes(1);
  expect((await state.db.select().from(bookingFollowups))[0]).toMatchObject({ status: "failed", reason: "Proveedor no disponible" });
});

it("no confunde una despedida o intención con haber reservado", () => {
  expect(reservaConfirmada("Ya, listo")).toBe(false);
  expect(reservaConfirmada("Quiero agendar")).toBe(false);
  expect(reservaConfirmada("No, todavía no agendé")).toBe(false);
  expect(reservaConfirmada("Sí, ya agendé")).toBe(true);
});
