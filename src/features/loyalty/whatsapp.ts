/**
 * Links de WhatsApp (`wa.me`): abren el chat con el mensaje ya escrito, y la persona toca "Enviar".
 * No hace falta la API de Meta ni pagar por mensaje. Con el número propio, abre "Mensaje para vos".
 *
 * `wa.me` quiere el número internacional sin `+` ni espacios: para un celular argentino, `549…`,
 * que es justo como lo guarda el backend (`+549…`).
 */
export function whatsAppUrl(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
