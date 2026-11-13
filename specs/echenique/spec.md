# Spec: CRM de Echenique Abogados

**Carril**: ligero  
**Estado**: implementacion inicial  
**Fecha**: 2026-11-11  
**Escrita antes del codigo**: si

## Problema

El estudio necesita organizar consultas juridicas, priorizar derecho de familia y dar seguimiento a la consulta pagada y a las propuestas. El CRM local viene con configuracion comercial generica.

## Escenarios y requisitos

- FR-001: Mostrar el nombre del estudio y una identidad grafica provisional, sin presentarla como logo oficial.
- FR-002: Distinguir ingreso, contacto, calificacion, cita, propuesta, seguimiento y cierre comercial.
- FR-003: Registrar area juridica, situacion general, urgencia, disposicion a una consulta pagada y estado de la cita sin pedir detalles sensibles innecesarios.
- FR-004: Orientar al asistente hacia una atencion empatica, una pregunta a la vez y derivacion humana; no dar asesoramiento juridico, prometer resultados ni inventar precios, pagos o disponibilidad.
- FR-005: Conservar una base local sin datos de demostracion y sin conectar canales externos.
- FR-006: El prompt compartido debe explicar el flujo de consultas, usar las claves reales del pipeline y preparar una derivacion con resumen general antes de pausar la conversacion.
- FR-007: Los precios, los horarios, las condiciones de pago y el resultado del caso no se inventan. La atencion urgente o con plazos se deriva sin prometer una respuesta inmediata.
- FR-008: La interfaz adopta la referencia suministrada: superficies oscuras, navegacion negra, paneles de carbon y acentos naranjas, preservando acciones y datos del CRM.
- FR-009: Un control junto a las notificaciones permite alternar entre modo claro y oscuro; la preferencia se conserva en el navegador.
- FR-010: Antes de ofrecer reunion, el asistente entiende la necesidad, situacion actual, antecedentes generales, objetivo y urgencia. Resume lo comprendido y solo entonces propone una consulta. Una peticion explicita de reunion o de atencion humana no se bloquea por preguntas pendientes.
- FR-011 (actualizado 13-11-2026): Familia/civil $50.000 CLP; penal $70.000 CLP. Duración programada 30 minutos, extensión eventual sin garantía. Informar tarifa y recoger aceptación expresa antes de coordinar. Pago previo por transferencia.
- FR-012: Conversacion natural, sin repetir validaciones o resúmenes en cada turno ni cerrar cada respuesta con una invitacion a agendar. Aclarar urgencia y fechas proximas antes de ofrecer diagnostico, salvo que la persona pida avanzar directamente.
- FR-013: El alcance actual termina al enviar un enlace de agenda configurado mediante AGENDA_URL, tras aceptacion de la persona. Si no existe, no inventar ni simular un envio. Enviar el enlace no confirma cita ni pago y no pausa el agente. La agenda y seguimiento automaticos siguen fuera de alcance.
- Dato autorizado para pruebas: usar literalmente [LINK] hasta contar con el enlace real. El marcador no es una URL operativa.
- FR-014: Pago previo por transferencia y sin devolucion, segun condicion confirmada por el negocio. Responderlo antes del pago cuando lo consulten, sin remitir la aclaracion a la reunion pagada.
- FR-015: Si necesita ayuda esta semana, guardar urgencia="Esta semana" aunque no existan fechas judiciales. El plazo deseado por el cliente se distingue de una urgencia juridica inmediata. No convertirlo en "Sin urgencia indicada".

## Configuracion y modulos

Configuracion en `config/cliente.ts` y marca provisional en `public/marca/`. No se crea ningun modulo ni tabla.

## Criterios de aceptacion

- CA-004: La página compartida de testeo usa textos y sugerencias jurídicas configurados en `config/cliente.ts`, sin referencias a búsqueda de propiedades ni visitas inmobiliarias.
- CA-005: El resumen del estudio y los reportes describen seguimiento de consultas y contratación, sin presentar el pipeline como gestión de causas judiciales. Las conversaciones demo son jurídicas y no se cargan automáticamente.

- CA-001: La marca y las etapas aparecen en la instancia local.
- CA-002: Los campos adicionales aparecen en el formulario de contacto.
- CA-003: La configuracion valida y el inicio no vuelve a generar datos demo.

## Constitution Check

- I. Nucleo intocable: la adaptacion se hace en config y assets.
- II. Spec antes que codigo: cumple.
- III. Autoverificacion: comprobacion local; autenticacion, agente y canales reales quedan pendientes de sus credenciales y configuracion.
- IV. Cero secretos: cumple; sin datos de contactos reales.

## Pendientes y fuera de alcance

Confirmar logo y colores oficiales, agenda, canales y datos bancarios. Quedan pendientes la solucion de agenda/pago (posible Calendly), el webhook de confirmacion y la validacion de identidad y pago; no se implementan ni se presentan como disponibles. La gestion detallada de causas y documentos requiere especificacion propia; las etapas de este pipeline representan el proceso comercial, no el juicio.

## Actualización de condiciones (13-11-2026)

Fuente y alcance: `Astrid/condiciones-confirmadas-2026-11-13.md`. Prompt operativo en `config/echenique-agente.ts`. Se agregan pretensión, aceptación de valor y disponibilidad de antecedentes a la ficha. Diagnóstico escrito en 48-72 horas hábiles; descuento por contratación dentro de 15 días desde la entrega del diagnóstico escrito; presupuesto orientativo por tramos, pie 30-50% o cuota litis 15-25% según acuerdo; reporte humano tras audiencia. No garantizar devoluciones por retraso, revisión gratuita, resultados ni automatizaciones. No anunciar casos desde $1.000.000.
