# Compatibilidad de cuentas de Zernio

Fecha: 2026-11-11. Escrita antes del codigo: si.

La respuesta real de /accounts usa accounts en lugar de data, _id en lugar de id y puede incluir profileId como objeto. El conector debe normalizar ambas variantes antes de sincronizar, conservando los metadatos existentes. Una cuenta conectada debe aparecer en el CRM tras sincronizar. No se cambian credenciales ni permisos externos.
