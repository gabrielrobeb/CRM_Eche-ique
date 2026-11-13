# Proveedor directo de OpenAI

Fecha: 2026-11-11. Spec escrita antes del codigo.

El agente debe poder usar OpenAI directamente con OPENAI_API_KEY y AGENT_PROVIDER=openai, manteniendo el bucle actual de mensajes y herramientas. AGENT_MODEL configura el modelo; el default para OpenAI sera gpt-4.1-mini. OpenRouter se conserva como opcion explicita y para instalaciones antiguas que solo tengan su clave.

Los avisos de capacidades y simulador deben comprobar la clave del proveedor seleccionado, sin mostrar secretos. No hay fallback automatico ante errores del proveedor. La instancia local queda preparada para OpenAI, con la clave vacia hasta que la aporte el usuario.

Verificacion: tests de seleccion, clave, endpoint y modelo; typecheck y pruebas del nucleo. La prueba remota queda pendiente si no existe clave de OpenAI.
