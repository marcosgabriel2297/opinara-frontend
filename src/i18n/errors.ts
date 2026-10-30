import { ClientErrorCodes } from '@/lib/http';

/**
 * Mensajes por `errorCode`. El backend manda `message` en inglés y sin garantía de estabilidad:
 * la UI nunca lo muestra ni lo parsea, solo mira el código.
 */
export const errorMessages: Record<string, string> = {
  // Generales
  INTERNAL_SERVER_ERROR: 'Algo se rompió de nuestro lado. Probá de nuevo en un momento.',
  BAD_REQUEST: 'Los datos enviados no son válidos.',
  UNAUTHORIZED: 'Tenés que iniciar sesión.',
  FORBIDDEN: 'No tenés permiso para hacer esto.',
  NOT_FOUND: 'No encontramos lo que buscabas.',
  CONFLICT: 'El recurso ya está en otro estado.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Esperá un minuto y probá de nuevo.',
  SERVICE_UNAVAILABLE: 'El servicio no está disponible en este momento.',
  INVALID_URN: 'El identificador no es válido.',
  SLUG_NOT_DERIVABLE: 'No pudimos armar un identificador con ese nombre. Escribí uno a mano.',

  // Autenticación
  WRONG_CREDENTIALS: 'Email o contraseña incorrectos.',
  EMAIL_ALREADY_EXISTS: 'Ese email ya está registrado.',
  USER_NOT_FOUND: 'No encontramos ese usuario.',
  USER_INACTIVE: 'Tu cuenta está desactivada. Escribinos para reactivarla.',
  INVALID_REFRESH_TOKEN: 'Tu sesión venció. Iniciá sesión de nuevo.',
  INVALID_RESET_TOKEN: 'El link para cambiar la contraseña venció o ya se usó. Pedí uno nuevo.',
  PASSWORD_CHANGE_REQUIRED: 'Antes de seguir tenés que cambiar la contraseña provisoria.',
  WRONG_CURRENT_PASSWORD: 'La contraseña provisoria no es correcta.',
  SAME_PASSWORD: 'Elegí una contraseña distinta de la provisoria.',

  // Negocios
  BUSINESS_NOT_FOUND: 'No encontramos el negocio.',
  BUSINESS_SLUG_ALREADY_EXISTS: 'Ese identificador ya está en uso.',
  BUSINESS_FORBIDDEN: 'No tenés acceso a este negocio.',
  BUSINESS_SUSPENDED: 'El negocio está suspendido.',
  LOGO_INVALID_IMAGE: 'Esa imagen no se pudo usar. Probá con un PNG, JPG, WebP o SVG.',
  LOGO_TOO_LARGE: 'La imagen es demasiado pesada. Probá con una más chica.',
  LOGO_NOT_FOUND: 'El negocio no tiene logo.',

  // Equipo
  MEMBER_NOT_FOUND: 'Esa persona ya no está en el equipo.',
  MEMBER_ALREADY_EXISTS: 'Esa persona ya está en el equipo.',
  MEMBER_ROLE_NOT_ALLOWED: 'Tu rol no permite hacer este cambio.',
  INVITATION_NOT_FOUND: 'No encontramos esa invitación.',
  INVITATION_INVALID: 'La invitación venció, fue anulada o ya se usó.',
  INVITATION_EMAIL_MISMATCH: 'La invitación es para otro email.',
  INVITEE_NOT_REGISTERED:
    'No hay una cuenta con ese email. Pedile a un administrador de Opinara que la cree y después invitala.',

  // Google
  GOOGLE_NOT_CONFIGURED: 'La conexión con Google no está configurada en el servidor.',
  GOOGLE_CONNECTION_NOT_FOUND: 'Todavía no conectaste tu cuenta de Google.',
  GOOGLE_ALREADY_CONNECTED: 'Este negocio ya tiene una conexión activa con Google.',
  GOOGLE_CONNECTION_REVOKED: 'Se revocó el acceso a Google. Hay que volver a conectar la cuenta.',
  GOOGLE_INVALID_OAUTH_STATE: 'El pedido de autorización venció. Empezá la conexión de nuevo.',
  GOOGLE_OAUTH_EXCHANGE_FAILED: 'No pudimos completar la autorización con Google. Probá de nuevo.',
  GOOGLE_MISSING_REFRESH_TOKEN: 'Google no devolvió los permisos completos. Volvé a conectar la cuenta.',
  GOOGLE_PERMISSION_DENIED: 'Google no autoriza el acceso a ese recurso.',
  GOOGLE_RESOURCE_NOT_FOUND: 'Ese recurso ya no existe en Google Business Profile.',
  GOOGLE_RATE_LIMITED: 'Google está limitando los pedidos. Reintentá en un rato.',
  GOOGLE_UNAVAILABLE: 'Google no responde en este momento. Reintentá en un rato.',

  // Sucursales y reseñas
  LOCATION_NOT_FOUND: 'No encontramos la sucursal.',
  LOCATION_ALREADY_IMPORTED: 'Esa sucursal ya está en Opinara.',
  LOCATION_NOT_SYNCABLE: 'Esa sucursal se cargó a mano: va a traer reseñas cuando la importes desde Google.',
  LOCATION_NOT_REVIEWABLE: 'Esa sucursal no tiene link de reseñas en Google.',
  REVIEW_NOT_FOUND: 'No encontramos la reseña.',
  REVIEW_REPLY_NOT_FOUND: 'Esa reseña no tiene respuesta.',
  REPLY_SUGGESTIONS_UNAVAILABLE: 'Las respuestas sugeridas no están disponibles. Escribila a mano.',
  REPLY_SUGGESTION_FAILED: 'No pudimos sugerir una respuesta ahora. Escribila a mano o probá de nuevo.',

  // Campañas
  CAMPAIGN_NOT_FOUND: 'No encontramos la campaña.',
  CAMPAIGN_SLUG_ALREADY_EXISTS: 'Ya tenés una campaña con ese identificador.',
  CAMPAIGN_INACTIVE: 'La campaña no está activa.',

  // Del cliente
  [ClientErrorCodes.NETWORK_ERROR]: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
  [ClientErrorCodes.INVALID_RESPONSE]: 'Recibimos una respuesta inesperada del servidor.',
  [ClientErrorCodes.SESSION_EXPIRED]: 'Tu sesión venció. Iniciá sesión de nuevo.',
};

export const fallbackErrorMessage = 'Algo salió mal. Probá de nuevo.';
