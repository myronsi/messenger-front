export const docs = {
  docsLink: "Ayuda y documentación",
  docs: {
    title: "Ayuda de Messenger",
    subtitle: "Instrucciones breves para las tareas del día a día, novedades recientes y lo que viene a continuación.",
    backToApp: "Volver a la app",
    stepsCount: "{count} pasos",
    contents: "Contenido",
    sections: [
      {
        id: "getting-started",
        title: "Crear una cuenta",
        steps: [
          "Abre la app y elige Registrarse.",
          "Elige un nombre de usuario de 3 a 32 caracteres (letras, números y guiones bajos) y una contraseña de al menos 8 caracteres.",
          "Guarda en un lugar seguro la clave de recuperación que aparece tras el registro y confirma que la has guardado. La necesitarás si olvidas tu contraseña.",
        ],
      },
      {
        id: "chats",
        title: "Iniciar un chat",
        steps: [
          "Usa la búsqueda en la parte superior de la lista de chats para encontrar a una persona por su nombre de usuario.",
          "Abre su perfil y pulsa Mensaje para iniciar un chat directo.",
          "Si la persona solo acepta mensajes tras aprobarlos, tu primer mensaje esperará en su bandeja de solicitudes hasta que lo apruebe.",
        ],
      },
      {
        id: "messages",
        title: "Trabajar con mensajes",
        steps: [
          "Adjunta fotos, mensajes de voz y archivos junto al campo de mensaje.",
          "Haz clic derecho en un mensaje (o mantenlo pulsado en el móvil) para responder, editarlo, copiarlo, reenviarlo, reaccionar o eliminarlo.",
          "Elimina un mensaje solo para ti o para todos los del chat.",
          "El texto sin enviar se guarda como borrador en cada chat mientras la pestaña esté abierta.",
          "Usa Buscar en el chat desde la cabecera del chat para encontrar mensajes antiguos.",
        ],
      },
      {
        id: "groups",
        title: "Grupos",
        steps: [
          "Abre tu perfil, elige Crear grupo y añade participantes.",
          "Los propietarios y administradores pueden cambiar el nombre del grupo, su avatar y su descripción, y añadir o quitar participantes.",
          "Abre el estado de lectura de un mensaje para ver quién lo ha leído ya.",
          "Para salir de un grupo que te pertenece, primero transfiere la propiedad a otro participante.",
        ],
      },
      {
        id: "profile",
        title: "Perfil y privacidad",
        steps: [
          "Abre tu perfil desde la lista de chats para cambiar tu foto, tu nombre visible y tu biografía.",
          "En Privacidad elige quién puede escribirte, invitarte a grupos, ver tu avatar, tu biografía y tu estado en línea, y encontrarte en la búsqueda.",
          "Bloquea a un usuario desde su perfil. Los usuarios bloqueados no pueden escribirte ni invitarte a grupos.",
          "Cambia el idioma de la app en los ajustes de tu perfil.",
        ],
      },
      {
        id: "recovery",
        title: "¿Olvidaste tu contraseña?",
        steps: [
          "En la pantalla de inicio de sesión elige ¿Olvidaste tu contraseña? y selecciona tu nombre de usuario.",
          "Introduce tu clave de recuperación guardada y una contraseña nueva. Si tienes activada la autenticación en dos pasos, introduce también un código del autenticador o un código de respaldo.",
          "Guarda la nueva clave de recuperación antes de continuar. La clave anterior deja de funcionar y se cierran tus otras sesiones.",
          "Los cambios en los métodos de seguridad quedan restringidos temporalmente durante 24 horas tras la recuperación. Las partes de recuperación antiguas y las partes de código QR no pueden sustituir a la clave de recuperación.",
        ],
      },
      {
        id: "security",
        title: "Protege tu cuenta",
        steps: [
          "Abre Seguridad y dispositivos en tu perfil para gestionar la autenticación en dos pasos y revisar las sesiones iniciadas.",
          "Si tu cuenta aún no tiene una clave de recuperación, crea una mientras todavía recuerdes tu contraseña. Introduce tu código del autenticador o tu código de respaldo si se te pide.",
          "Guarda de inmediato cualquier clave de recuperación nueva. Al crear una nueva, la anterior deja de ser válida.",
          "Cierra las sesiones que ya no uses. Guarda los códigos de respaldo del autenticador por separado de tu clave de recuperación.",
        ],
      },
      {
        id: "notifications",
        title: "Notificaciones de mensajes",
        steps: [
          "Abre Notificaciones en tu perfil para gestionar los avisos de mensajes, el sonido y las vistas previas de los mensajes.",
          "Activa ahí las notificaciones del navegador y acepta la solicitud de permiso del navegador si quieres recibir avisos en segundo plano.",
          "Silencia chats concretos cuando no quieras recibir avisos. Los ajustes del navegador o del dispositivo también pueden bloquear las notificaciones.",
        ],
      },
      {
        id: "install",
        title: "Instalar la app",
        steps: [
          "En un ordenador o en un móvil Android, usa la opción Instalar app del navegador.",
          "En iPhone o iPad, abre el sitio en Safari, toca Compartir y luego Añadir a pantalla de inicio.",
          "Cuando haya una nueva versión disponible, la app te avisará; pulsa Recargar para actualizar.",
        ],
      },
    ],
    upcomingTitle: "Próximas funciones",
    upcomingIntro: "Estamos trabajando en esto. Los planes pueden cambiar, así que aún no hay fechas.",
    upcoming: [
      { id: "search", title: "Búsqueda", description: "Encuentra mensajes en todos tus chats y busca personas por su nombre, con las palabras coincidentes resaltadas." },
      { id: "attachments", title: "Mejor control de las subidas", description: "Más opciones para cancelar y reintentar la subida de archivos." },
      { id: "passkeys", title: "Iniciar sesión con una llave de acceso", description: "Usa Face ID, tu huella dactilar, Windows Hello o una llave de seguridad en lugar de una contraseña." },
      { id: "device-approval", title: "Aprobar la recuperación desde otro dispositivo", description: "Restablece tu contraseña aprobando la solicitud en un dispositivo en el que aún tengas la sesión iniciada." },
      { id: "email-recovery", title: "Correo de recuperación", description: "Añade, si quieres, una dirección de correo que solo se usará para recuperar tu cuenta y avisarte de cambios de seguridad." },
      { id: "security-settings", title: "Historial de actividad de seguridad", description: "Revisa los inicios de sesión recientes y los cambios de seguridad en un solo lugar." },
    ],
    whatsNewTitle: "Novedades",
    whatsNewIntro: "Cambios en las últimas versiones de la app.",
    version: "Versión {version}",
    changeKinds: { features: "Nuevo", fixes: "Corregido", performance: "Más rápido" },
  },
};
