import { expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { registrarDatosConfirmados } from "@/lib/agent/registro";

function entrada(args: object) {
  const create = vi.fn().mockResolvedValue({ choices: [{ message: { tool_calls: [
    { type: "function", function: { name: "actualizar_contacto", arguments: JSON.stringify(args) } },
  ] } }] });
  const guardar = vi.fn().mockResolvedValue({ ok: true });
  return { client: { chat: { completions: { create } } } as unknown as OpenAI,
    model: "modelo-prueba", tool: { type: "function" as const, function: { name: "actualizar_contacto" } },
    historial: [{ role: "user" as const, content: "Necesito asesoria con un divorcio" }],
    contexto: "", instrucciones: "", guardar, create };
}

it("registra campos antes de responder usando solo la herramienta de registro", async () => {
  const input = entrada({ campos: { area_juridica: "Familia" } });
  expect(await registrarDatosConfirmados(input)).toEqual({ ok: true, guardado: true, error: undefined });
  expect(input.guardar).toHaveBeenCalledWith({ campos: { area_juridica: "Familia" } });
  expect(input.create.mock.calls[0][0]).toMatchObject({ tool_choice: { function: { name: "actualizar_contacto" } }, parallel_tool_calls: false });
});

it("no borra datos desconocidos ni registra notas libres", async () => {
  const input = entrada({ notas: "detalle privado", campos: { urgencia: null }, nombre: "" });
  expect(await registrarDatosConfirmados(input)).toMatchObject({ ok: true, guardado: false });
  expect(input.guardar).not.toHaveBeenCalled();
});

it("propaga el rechazo de un valor invalido para permitir correccion", async () => {
  const input = entrada({ campos: { area_juridica: "opcion inexistente" } });
  input.guardar.mockResolvedValue({ ok: false, error: "opcion invalida" });
  expect(await registrarDatosConfirmados(input)).toMatchObject({ ok: false, guardado: false, error: "opcion invalida" });
});
