import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { moduloActivo } from "@/lib/config";
import { firmarTesteo } from "@/lib/testeo-token";

export async function POST() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  if (!moduloActivo("simulador")) return NextResponse.json({ error: "Simulador desactivado" }, { status: 404 });
  try {
    return NextResponse.json({ path: `/testeo?token=${firmarTesteo("acceso")}` });
  } catch {
    return NextResponse.json({ error: "Configura AGENT_WORKER_SECRET para compartir el testeo." }, { status: 503 });
  }
}
