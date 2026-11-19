# Ayuda y seguimiento de agenda

Reglas confirmadas por el usuario el 19 de noviembre de 2026:

- Horarios incompatibles: derivar directamente al equipo y avisar que revisará si puede atender en otro horario. No ofrecer ayuda como pregunta ni pedir aceptación previa; no prometer disponibilidad ni reservar una hora incompatible.
- Dificultades para agendar: derivar directamente y avisar que alguien del equipo le ayudará a agendar. No pedir aceptación previa. Respetar un rechazo explícito a la derivación.
- Tras enviar el enlace: persistir un seguimiento para preguntar «¿Pudiste agendar tu consulta?» a los 30 minutos. Un seguimiento por conversación, sin rearmarlo al reenviar el enlace. Omitir si ya consta reserva, cancelación, rechazo, pausa del agente, derivación o intervención humana. Respetar la ventana de texto libre del canal.
- Consulta inicial: pago completo previo por transferencia, sin cuotas. Explicar el descuento de su valor sobre honorarios si contrata dentro de 15 días desde la entrega del diagnóstico escrito. Las condiciones de representación son distintas.

## Implementación y operación

`booking_followups` guarda vencimiento, estado y motivo. El worker reclama cada fila de forma atómica para evitar duplicados. Si el proceso se interrumpe durante un envío, marca el seguimiento para revisión y no lo reintenta a ciegas. Solo se programan mensajes del agente enviados correctamente con el enlace real; `[LINK]` no activa seguimiento.

Netlify ejecuta `netlify/functions/seguimiento-agenda.mts` cada minuto contra `GET /api/agent/seguimiento-agenda`, protegido por `AGENT_WORKER_SECRET`. El envío ocurre a partir del minuto 30, normalmente entre los minutos 30 y 31. Si hay conversación activa, se difiere al siguiente barrido. En otros alojamientos debe llamarse esa misma ruta cada minuto con el secreto. En desarrollo local el cron no corre automáticamente.

Para activar en producción: aplicar `20261119000000_seguimiento_agenda.sql`, publicar el código y la función programada, y conservar `APP_BASE_URL` y `AGENT_WORKER_SECRET` en el ámbito Functions. No se crean seguimientos retroactivos para enlaces de conversaciones anteriores. Las pruebas no envían mensajes a personas reales.
