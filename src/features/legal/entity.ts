/**
 * Quiénes prestan el servicio, tal como figuran en los documentos legales. Si cambia un titular o
 * el mail de contacto (por uno del dominio), se cambia acá y lo toman las dos páginas.
 */
export const legalEntity = {
  holders: [
    {
      name: 'Dylan Jonathan Salgado',
      cuit: '20-44450553-3',
      address: 'Almirante Brown 3595, Tortuguitas, provincia de Buenos Aires',
    },
    {
      name: 'Marcos Gabriel Vera',
      cuit: '20-40648005-5',
      address: 'Haití 229, Tortuguitas, provincia de Buenos Aires',
    },
  ],
  jurisdiction: 'Tortuguitas, provincia de Buenos Aires',
  contact: 'opinara.soporte@gmail.com',
} as const;

/** La fecha que muestran las dos páginas. Se actualiza cada vez que cambia el contenido. */
export const LEGAL_UPDATED_AT = '30 de octubre de 2026';
