import { definirConfig } from "@/lib/config/schema";
import modulos from "./modulos.json";
import { promptEchenique } from "./echenique-agente";

export default definirConfig({
  marca: {
    nombre: "Echenique Abogados",
    nombreCorto: "Echenique",
    descripcion: "Asesoría jurídica especializada con atención cercana y personalizada.",
    // Identidad provisional hasta recibir los activos oficiales del estudio.
    logo: "/marca/echenique.svg",
    icono: "/marca/echenique.svg",
    colorPrimario: "#E9470A",
    colorSidebar: "#09090B",
  },
  idioma: "es",
  moneda: "CLP",
  zonaHoraria: "America/Santiago",
  roles: { etiquetaAsesor: "Asesor jurídico" },
  testeo: {
    titulo: "Cuéntanos qué necesitas resolver",
    descripcion: "Prueba el asistente con un caso ficticio de familia, civil o penal. Elige una sugerencia o escribe tu consulta, sin compartir datos personales reales. Esta es una prueba de atención inicial; la evaluación del caso corresponde a la abogada.",
    sugerencias: [
      "Hola, quisiera orientación sobre un divorcio.",
      "Hola, necesito ayuda con un contrato de arriendo.",
      "Hola, necesito asesoría para defenderme de una denuncia penal.",
    ],
  },
  pipeline: {
    nombre: "Consultas jurídicas",
    etapas: [
      { clave: "nuevo", nombre: "Nueva consulta", color: "#64748b" },
      { clave: "contactado", nombre: "En contacto", color: "#2563eb" },
      { clave: "calificado", nombre: "Consulta calificada", color: "#7c3aed" },
      { clave: "cita_agendada", nombre: "Cita agendada", color: "#0891b2" },
      { clave: "cita_realizada", nombre: "Cita realizada", color: "#0e7490" },
      { clave: "propuesta", nombre: "Propuesta enviada", color: "#d97706" },
      { clave: "negociacion", nombre: "Seguimiento de propuesta", color: "#ea580c" },
      { clave: "ganado", nombre: "Servicio contratado", color: "#15803d", ganada: true },
      { clave: "perdido", nombre: "No contratado", color: "#b91c1c", perdida: true },
    ],
  },
  contacto: {
    campos: [
      {
        clave: "area_juridica", etiqueta: "Área jurídica", tipo: "seleccion",
        opciones: ["Familia", "Civil", "Penal", "Otra", "Por definir"],
        enTabla: true,
        agente: { descripcion: "Familia, Civil o Penal según la consulta; escrituras, propiedad y estudios de título se clasifican Civil. Otra solo para materias fuera de estas áreas. No pedir detalles sensibles" },
      },
      {
        clave: "situacion_consulta", etiqueta: "Situación de la consulta", tipo: "seleccion",
        opciones: ["Notificación recibida", "Proceso en curso", "Asesoría preventiva", "Otro", "Por definir"],
        ayuda: "Registra solo la situación general; evita detalles sensibles.",
        agente: { descripcion: "si busca orientación inicial, ya inició gestiones o tiene un proceso o notificación; averigua antecedentes generales, sin interpretar documentos" },
      },
      {
        clave: "urgencia", etiqueta: "Urgencia", tipo: "seleccion",
        opciones: ["Urgente", "Esta semana", "Sin urgencia indicada", "Por definir"],
        enTabla: true,
        agente: { descripcion: "guardar Esta semana si quiere ayuda esta semana aunque no haya fecha judicial; Urgente si expresa urgencia inmediata o plazo cercano. Registrar fechas concretas en resumen; no degradar prioridad por ausencia de notificacion" },
      },
      {
        clave: "consulta_pagada", etiqueta: "Interés en consulta pagada", tipo: "seleccion",
        opciones: ["Interesado", "Solicita información", "No interesado", "Por definir"],
        agente: { descripcion: "registrar interés solo después de comprender el caso y proponer la consulta; no preguntar por pago al inicio ni asumir aceptación" },
      },
      {
        clave: "pretension", etiqueta: "Qué desea resolver", tipo: "texto",
        ayuda: "Objetivo general, sin detalles sensibles ni estrategia jurídica.",
        agente: { descripcion: "pretensión expresada por la persona: qué desea resolver; breve y sin inferir estrategias" },
      },
      {
        clave: "aceptacion_valor", etiqueta: "Aceptación del valor de consulta", tipo: "seleccion",
        opciones: ["Pendiente", "Aceptado", "No aceptado"],
        enTabla: true,
        agente: { descripcion: "Aceptado solo tras informar $50.000 CLP familia/civil o $70.000 CLP penal y recibir aceptación explícita; interés no equivale a aceptación ni a pago" },
      },
      {
        clave: "antecedentes_previos", etiqueta: "Antecedentes para la consulta", tipo: "seleccion",
        opciones: ["Por consultar", "Dispone de demanda", "Dispone de documentos fundantes", "No dispone de documentos", "Por preparar"],
        ayuda: "Disponibilidad declarada; no acredita recepción o revisión.",
        agente: { descripcion: "disponibilidad de demanda o documentos fundantes confirmada; no guardar contenido ni simular recepción o revisión" },
      },
      {
        clave: "estado_cita", etiqueta: "Estado de la cita", tipo: "seleccion",
        opciones: ["Sin agendar", "Enlace enviado", "Por confirmar", "Agendada", "Realizada", "No asistió", "Cancelada"],
        ayuda: "Actualiza el estado después de confirmarlo con el equipo.",
      },
      {
        clave: "pago_consulta", etiqueta: "Pago de la consulta", tipo: "seleccion",
        opciones: ["Sin confirmar", "Pendiente", "Confirmado", "No aplica"],
        ayuda: "El equipo debe verificar el pago antes de marcarlo como confirmado.",
      },
    ],
  },
  agente: {
    nombre: "Asistente de Echenique Abogados",
    agenda: {
      campoArea: "area_juridica", tarifas: { Familia: 50000, Civil: 50000, Penal: 70000 },
      asistenciaEquipo: true,
      seguimiento: { minutos: 30, mensaje: "¿Pudiste agendar tu consulta?", campoEstado: "estado_cita", estadosFinales: ["Agendada", "Realizada", "Cancelada"] },
    },
    mensajesDerivacion: {
      riesgo_personal: "Tu seguridad es lo primero. Si hay peligro inmediato, llama al 133 de Carabineros; para orientación por violencia intrafamiliar, al Fono Familia 149. No esperes nuestra respuesta ante una emergencia. Te voy a derivar con alguien del equipo para que revise tu situación con prioridad.",
      plazo_proximo: "Por la cercanía de tu audiencia o plazo, te voy a derivar con alguien del equipo para que revise tu solicitud lo antes posible. La fecha y los plazos siguen vigentes; esta derivación no confirma representación ni una hora de respuesta. No esperes nuestra respuesta para buscar asistencia jurídica oportuna.",
    },
    camposDerivacionUrgente: { urgencia: "Urgente" },
    mensajeDerivacion: "Dejé tu solicitud y el resumen para el equipo. Continuarán contigo para coordinar los próximos pasos; todavía no hay una hora reservada.",
    prompt: promptEchenique,
  },
  demo: {
    valoresTexto: ["Orientación inicial sobre su situación", "Evaluar próximos pasos con la abogada", "Comprender el alcance de la representación"],
    conversaciones: [
      [
        { dir: "in", body: "Hola, quisiera orientación sobre un divorcio." },
        { dir: "out", origen: "agent", body: "Hola, soy el asistente virtual de Echenique Abogados. ¿Ya iniciaron alguna gestión?" },
        { dir: "in", body: "Aún no, estamos conversándolo." },
      ],
      [
        { dir: "in", body: "¿Cuánto cuesta la reunión de diagnóstico?" },
        { dir: "out", origen: "agent", body: "La consulta inicial cuesta $50.000 CLP en familia y civil, y $70.000 CLP en penal. Dura 30 minutos programados y contempla un diagnóstico escrito posterior en 48 a 72 horas hábiles. El valor no cubre la representación." },
      ],
      [
        { dir: "in", body: "¿Cómo se paga la consulta?" },
        { dir: "out", origen: "agent", body: "Se paga antes de la reunión por transferencia. El equipo te facilitará los datos bancarios." },
      ],
      [
        { dir: "in", body: "Quiero hablar con una persona del equipo." },
        { dir: "out", origen: "agent", body: "Dejé tu solicitud para el equipo de Echenique Abogados. Continuarán contigo para coordinar los próximos pasos; todavía no hay una hora reservada." },
      ],
    ],
  },
  modulos: {
    nucleo: {
      automatizaciones: true, actividades: true, plantillas: true,
      push: true, reportes: true, simulador: true,
    },
    activos: modulos.activos,
  },
});
