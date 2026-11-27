# Buffer de mensajes

Fecha: 2026-11-11. Cambio acotado de configuracion del nucleo.

La espera queda en 5 segundos desde el ultimo mensaje de cada conversacion. Cada nuevo mensaje reinicia la ventana usando process_after. El disparador utiliza queueConfig.debounceMs, por lo que conserva el mismo intervalo que la cola. No requiere cambios de base de datos.
