/** Ids que el input tiene que anunciar en `aria-describedby`. */
export function describedBy(
  id: string,
  { error, hint }: { error?: string | undefined; hint?: boolean },
): string | undefined {
  if (error !== undefined) return `${id}-error`;
  if (hint === true) return `${id}-hint`;

  return undefined;
}
