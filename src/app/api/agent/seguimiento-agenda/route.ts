import { NextRequest, NextResponse } from "next/server";
import { autorizadoPorSecreto } from "@/lib/secreto-worker";
import { procesarSeguimientosAgenda } from "@/lib/agent/seguimiento-agenda";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET(request: NextRequest) {
  if (!autorizadoPorSecreto(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ processed: await procesarSeguimientosAgenda() });
}
