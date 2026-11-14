import type { REMINDER_PLACEHOLDERS } from './api/validation';

export interface ReminderContext {
  name: string;
  stamps: number;
  stampsRequired: number;
  missingStamps: number;
  rewardDescription: string;
  businessName: string;
  locationTitle: string;
  cardUrl: string;
}

/**
 * Arma el recordatorio como el backend (`renderReminder`): reemplaza las variables y agrega el link
 * de la tarjeta al final. Acá solo se usa para la vista previa; el mensaje de verdad lo arma el backend.
 */
export function renderReminder(template: string, context: ReminderContext): string {
  const values: Record<(typeof REMINDER_PLACEHOLDERS)[number], string> = {
    nombre: context.name.trim().split(/\s+/)[0] ?? context.name,
    faltan: context.missingStamps === 1 ? '1 sello' : `${String(context.missingStamps)} sellos`,
    sellos: `${String(context.stamps)} de ${String(context.stampsRequired)} sellos`,
    premio: context.rewardDescription,
    negocio: context.businessName,
    sucursal: context.locationTitle,
  };
  const text = template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? values[name as keyof typeof values] : match,
  );
  return `${text.trim()}\n${context.cardUrl}`;
}
