/** En qué sucursal está la caja de este dispositivo, por negocio. Se elige una vez y queda. */
const KEY = 'opinara.loyalty-register';

function read(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function readRegisterProgram(businessUrn: string): string | null {
  const value = read()[businessUrn];
  return typeof value === 'string' ? value : null;
}

export function writeRegisterProgram(businessUrn: string, programUrn: string | null): void {
  const others = Object.fromEntries(Object.entries(read()).filter(([key]) => key !== businessUrn));
  const next = programUrn === null ? others : { ...others, [businessUrn]: programUrn };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento, la caja vuelve a preguntar la sucursal.
  }
}
