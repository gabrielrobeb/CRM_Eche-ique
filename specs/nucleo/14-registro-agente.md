# Registro de datos confirmados antes de responder

Fecha: 2026-11-11. Escrita antes del codigo: si.

Problema: el agente puede mover etapas y responder sin llamar a actualizar_contacto, dejando vacios campos que el cliente ya confirmo.

Requisitos: si actualizar_contacto esta habilitada, realizar una extraccion acotada antes del turno conversacional usando el historial, la configuracion y los datos conocidos. Forzar esa herramienta en la llamada de extraccion; validar con el mecanismo existente y actualizar solo los datos confirmados. Los mensajes del asistente no son prueba de hechos del cliente. No cambiar etapas, derivar ni enviar mensajes desde este paso. No inventar urgencia, citas ni pagos. Releer el contexto despues de guardar. Si falla, registrar el error y dejar que el agente intente registrar durante la respuesta; nunca afirmar que se guardo si no fue asi.

Verificacion: campos confirmados se guardan aunque el turno conversacional no llame herramientas; sin nuevos datos no se modifica la ficha; los valores invalidos y campos desconocidos se rechazan.
