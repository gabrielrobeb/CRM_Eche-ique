# Derivaciones urgentes

Se corrigen las omisiones encontradas en las pruebas con el modelo real del 26 de noviembre.

- Amenaza de daño o peligro personal explícito: derivación `riesgo_personal`, prioridad de seguridad, aviso de emergencia configurado, sin ofrecer pago ni seguir calificando.
- Audiencia o plazo hoy/mañana: derivación `plazo_proximo`, aviso de traspaso al equipo para revisión lo antes posible, sin garantizar disponibilidad, representación o suspensión de plazos.
- Los mensajes inequívocos cubiertos por `detectarUrgencia` ejecutan la derivación antes del registro con LLM y de la respuesta comercial. Los demás siguen las reglas del agente; el detector no cubre todas las formulaciones posibles.
- Las negaciones explícitas incluidas en las pruebas no deben convertirse en emergencias.
- La herramienta marca urgencia y pausa el hilo; solo tras su éxito se informa el traspaso.

## Correo de alerta propuesto: pendiente

El usuario propone avisar por correo a Astrid tras una derivación urgente. No está implementado ni activado: falta confirmar correo destinatario y un servicio de envío; no hay configuración de correo transaccional disponible en el entorno local.

La alerta debe incluir tipo de urgencia y enlace autenticado a la conversación, evitando copiar documentos, relatos sensibles o datos de terceros. Debe quedar registrada para reintento y control de duplicados; un fallo del correo no debe impedir el aviso de seguridad al cliente ni reactivar al agente. No prometer que el correo ya llegó sin confirmación del proveedor. Las pruebas deben usar un transporte simulado, sin enviar mensajes reales.
