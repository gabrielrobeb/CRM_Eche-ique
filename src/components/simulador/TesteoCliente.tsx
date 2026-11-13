"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { marca, getConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";

type Mensaje = { id: string; direction: string; body: string | null };

export function TesteoCliente({ token }: { token: string }) {
  const m = marca();
  const { testeo } = getConfig();
  const [session, setSession] = useState<{ conversationId: string; session: string } | null>(null);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy]);

  async function enviar() {
    if (!texto.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      async function post(body: object) {
        const response = await fetch("/api/testeo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo enviar el mensaje.");
        return data;
      }
      const current = session ?? await post({ action: "crear" });
      setSession(current);
      const data = await post({ ...current, texto: texto.trim() });
      setMessages(data.messages);
      setTexto("");
      if (!data.responded) setError("El asistente no pudo responder. Puedes intentar con otro mensaje.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error. Inténtalo nuevamente.");
    } finally { lock.current = false; setBusy(false); }
  }

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col px-4 py-5 sm:px-8 sm:py-8">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Image src={m.logo} alt="" width={42} height={42} unoptimized className="h-10 w-10 object-contain" />
          <div><p className="font-semibold">{m.nombre}</p><h1 className="text-sm text-muted-foreground">Prueba del asistente</h1></div>
        </div>
        <Button variant="outline" disabled={busy || !session} onClick={() => { setSession(null); setMessages([]); setError(""); setTexto(""); }}>Reiniciar</Button>
      </header>
      <p className="mb-5 text-sm text-muted-foreground">Conversa como si fueras un cliente. Esta prueba usa el asistente real y registra la conversación de prueba.</p>
      <section aria-label="Conversación de prueba" className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card">
        <div role="log" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {!messages.length && <div className="py-6 sm:py-12"><h2 className="text-xl font-semibold">{testeo.titulo}</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{testeo.descripcion}</p><div className="mt-6 flex flex-col items-start gap-2">{testeo.sugerencias.map((sugerencia) => <button key={sugerencia} type="button" disabled={busy} onClick={() => setTexto(sugerencia)} className="min-h-11 rounded-lg border px-4 py-3 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">{sugerencia}</button>)}</div></div>}
          {messages.map((message) => <div key={message.id} className={`mb-4 flex ${message.direction === "in" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-4 py-3 text-sm ${message.direction === "in" ? "bg-primary text-primary-foreground" : "bg-muted"}`}><p className="mb-1 text-xs opacity-75">{message.direction === "in" ? "Tú" : "Asistente"}</p>{message.body}</div></div>)}
          {busy && <p role="status" className="text-sm text-muted-foreground">El asistente está respondiendo…</p>}<div ref={end} />
        </div>
        <form className="border-t p-4" onSubmit={(event) => { event.preventDefault(); void enviar(); }}>
          {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
          <label htmlFor="mensaje-testeo" className="sr-only">Tu mensaje</label>
          <div className="flex items-end gap-2"><textarea id="mensaje-testeo" value={texto} onChange={(event) => setTexto(event.target.value)} maxLength={4000} rows={2} disabled={busy} placeholder="Escribe tu mensaje…" className="min-h-12 min-w-0 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void enviar(); } }} /><Button type="submit" disabled={busy || !texto.trim()} className="min-h-12">Enviar</Button></div>
        </form>
      </section>
    </main>
  );
}
