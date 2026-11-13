import { validarTesteo } from "@/lib/testeo-token";
import { moduloActivo } from "@/lib/config";
import { TesteoCliente } from "@/components/simulador/TesteoCliente";

export const metadata = { title: "Prueba del asistente", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function TesteoPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!moduloActivo("simulador") || !token || !validarTesteo(token, "acceso")) {
    return <main className="mx-auto max-w-lg px-6 py-24"><h1 className="text-2xl font-semibold">Enlace no disponible</h1><p className="mt-3 text-muted-foreground">Este enlace no es válido o ha vencido. Solicita un nuevo enlace de prueba.</p></main>;
  }
  return <TesteoCliente token={token} />;
}
