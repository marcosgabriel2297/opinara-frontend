# Opinara — Frontend

SPA del SaaS de reputación: dashboard del negocio (escritorio) y la página pública del QR, que salta directo a Google,
en el mismo repo pero con bundles separados.

## Levantar

```bash
yarn install
cp .env.example .env.development   # ya viene creado
yarn dev                           # http://localhost:5173
```

Para el flujo de Google hace falta además que el backend tenga configurado a dónde volver
después del consentimiento:

```
GOOGLE_OAUTH_SUCCESS_URL=http://localhost:5173/settings/google/callback
GOOGLE_OAUTH_ERROR_URL=http://localhost:5173/settings/google/callback
```

El `.env.dev` del backend todavía apunta a la URL vieja, `/configuracion/google/conectado`: sigue
andando porque redirige a la nueva conservando `?error=` (ver "Rutas en inglés" más abajo).

Necesita el backend corriendo:

```bash
cd ../opinara-backend
yarn db:up && yarn seed && yarn start:dev   # API en http://localhost:3000/api
```

Usuarios sembrados (contraseña `claveSuperSegura1`): `dueno@`, `gerente@`, `empleada@`, `peluqueria@` `opinara.test`.

`VITE_API_BASE_URL=/api` pasa la API por el proxy del dev server (`vite.config.ts`): así, desde el
celular o un puerto reenviado de VS Code, alcanza con exponer el 5173.

Para trabajar sin backend, poné `VITE_ENABLE_MSW=true` en `.env.development`: MSW intercepta las
llamadas en el browser. Los tests siempre usan MSW, nunca la red.

**Modo demo.** Desde el login, "Ver una demo con datos de ejemplo" recorre el producto entero con
los mismos mocks, sin cuenta ni Google (también en producción). MSW se descarga recién al entrar
a la demo; un aviso arriba de todo deja claro que nada se publica. Se sale desde ese aviso o
cerrando la pestaña (vive en `sessionStorage`). Ver `src/lib/demo.ts`.

Las **respuestas sugeridas** necesitan `ANTHROPIC_API_KEY` en el backend; sin ella el botón no
aparece (lo decide el campo `replySuggestions` del resumen).

## Scripts

| Comando       | Qué hace                       |
| ------------- | ------------------------------ |
| `yarn dev`    | Servidor de desarrollo         |
| `yarn build`  | `tsc -b` + build de producción |
| `yarn test`   | Vitest (una pasada)            |
| `yarn lint`   | ESLint                         |
| `yarn format` | Prettier                       |

## Cómo está organizado

```
src/
  app/          router, providers, layouts, error boundary
  components/   ui/ = primitivos de shadcn; el resto son componentes de la app
  features/     una carpeta por dominio (auth, reviews, campaigns, landing…)
  i18n/         todos los textos y el mapa errorCode -> mensaje
  lib/http/     el cliente HTTP, el store de sesión y los errores tipados
  mocks/        handlers de MSW (browser y node)
  routes/       módulos de ruta, cargados con `lazy`
```

## Diseño

Editorial, sobre papel: fondo cálido, tinta casi negra y verde petróleo para la marca, la acción
principal de cada vista y las cifras; ámbar solo para las estrellas. Newsreader (títulos, citas
de clientes, cifras grandes) e Inter Tight (interfaz), servidas desde el propio sitio con
`@fontsource-variable` y `font-display: swap`. La landing del QR usa la fuente del sistema. Los
tokens y sus contrastes medidos están en `src/styles/index.css`.

- **Hoy** (`/`): cuántas reseñas esperan respuesta, en una frase y con un solo botón; debajo, las
  próximas de la fila, el promedio, los escaneos por semana y el estado de Google.
- **Modo foco** (`/reviews/respond`): las pendientes de todas las sucursales, de a una, la que
  más espera primero. Atajos `J`/`K` y `⌘/Ctrl+Enter`, vista previa de cómo se ve en Google,
  respuesta sugerida y "Deshacer" (borra en Google lo recién publicado).
- **Deshacer en vez de confirmar** al borrar una respuesta. Desconectar Google sigue con
  confirmación: la consecuencia (dejan de entrar reseñas) tiene que leerse antes.
- **Estudio de impresión**: cartel A4, señalador de mesa (A4 doblado, la mitad de arriba
  invertida) y stickers (seis por hoja). Todo en A4 y en negro.
- **El logo del negocio** (Configuración) va arriba en la app, en la pantalla del QR y en las
  hojas impresas. Sin logo, arriba se ve el de Opinara y las hojas salen solo con el nombre.
  Opinara queda como firma fija abajo a la derecha, en la app y en la pantalla del QR. La imagen
  se achica en el navegador (512 px, WebP o PNG) antes de subirla; el SVG se convierte ahí porque
  el backend no lo acepta. Ver `src/features/businesses/prepare-logo.ts`.
- **Transición entre secciones**: View Transitions (`viewTransition` en la navegación); solo se
  mueve el contenido, las barras quedan quietas. Sin movimiento con "reducir movimiento".

## Decisiones

**Un solo cliente HTTP** (`src/lib/http/client.ts`). Adjunta el access token, y ante un `401`
intenta `POST /auth/refresh` **una sola vez** con _single-flight_: si hay diez requests en vuelo se
dispara un único refresh y todas comparten el resultado. Si el refresh falla, limpia la sesión y el
store avisa a la app. Si otro request ya refrescó mientras este estaba en vuelo, reintenta con el
token vigente en vez de pedir otro refresh.

**Errores por `errorCode`, nunca por `message`.** El backend manda el mensaje en inglés y sin
garantía de estabilidad. `ApiError` siempre expone un `errorCode`; si el cuerpo del error no tiene
la forma esperada (un 502 de un proxy) se sintetiza uno a partir del status. El mapa a español está
en `src/i18n/errors.ts`.

**Zod en el borde.** Cada respuesta se valida contra un schema. Si el backend cambia, falla acá,
fuerte y claro (`CLIENT_INVALID_RESPONSE`), en vez de romper después en un `.map()`.

**Tokens: access en memoria, refresh en `localStorage`.** Tradeoff conocido y aceptado para esta
etapa: como el backend devuelve los tokens en el body, el refresh token queda legible por JS y por
lo tanto expuesto a XSS. La alternativa real es una cookie `httpOnly` emitida por el backend
(requiere cambio de backend: `Set-Cookie` en login/refresh, `credentials: 'include'` acá y CSRF en
los endpoints que mutan). Queda planteado, no asumido.

**Sesión.** Al abrir la app, si hay un refresh token guardado se hace **un solo**
`POST /auth/refresh`: ese endpoint devuelve también el usuario, así que no hace falta un
`GET /auth/me` extra. Mientras resuelve, los guards no deciden nada — si redirigieran durante
el `loading`, cualquier F5 adentro del dashboard rebotaría al login con la sesión válida.

**Cerrar sesión borra la sesión de este dispositivo, no la del servidor.** No hay endpoint de
logout, así que el refresh token sigue siendo válido hasta que expire (30 días). Ver
"Lo que falta del lado del backend".

**Negocio actual en `localStorage`, no en la URL.** Las rutas quedan limpias (`/reviews` en vez
de `/businesses/:urn/reviews`), que es lo natural cuando casi todo el mundo tiene un solo negocio.
El costo: un link compartido se abre en el negocio que tenga seleccionado quien lo recibe. Si
aparecen usuarios con varios negocios en serio, esto pasa a la URL.

**La vuelta del OAuth de Google no dice de qué negocio se trata.** El backend redirige siempre a
la misma URL fija (y solo agrega `?error=CODE` si falló), así que antes de mandar al usuario a
Google guardamos el `businessUrn` en `sessionStorage` y lo leemos al volver. Si el backend
agregara el negocio a esa URL, esto sobraría.

**"Conectada" no garantiza que Google responda.** `GET /google/connection` puede decir `ACTIVE`
mientras las llamadas a Google fallan con `GOOGLE_CONNECTION_REVOKED`: el backend marca la
conexión como revocada recién cuando intenta usarla. Por eso, cuando una pantalla recibe ese
error, revalida el estado de la conexión y ofrece **reconectar** en vez de reintentar — reintentar
el mismo request falla igual.

**Filtros y paginación de reseñas viven en la URL.** `/reviews?location=&rating=&replied=yes|no&page=`
se puede compartir ("mirá estas de 1 estrella sin responder") y el botón "atrás" funciona. Ojo con
`setSearchParams`: su forma funcional recibe los params del render en el que se creó el setter, y
llegó a perder `sucursal` al pasar de página. Por eso se arma el `URLSearchParams` a partir del
`searchParams` del render actual.

**Responder y editar son la misma pantalla.** El endpoint es `PUT` y crea o pisa la respuesta
indistintamente, igual que `updateReply` de Google: tener dos formularios sería inventar una
distinción que la API no hace.

**El sync puede fallar a medias.** `POST /google/sync` responde **200 con `failed > 0`** cuando
unas sucursales sincronizaron y otras no. La UI muestra las dos cosas y el motivo de cada falla,
traducido por `errorCode`; también avisa si la corrida quedó `truncated` (quedaron reseñas sin
traer y hay que volver a sincronizar).

**El QR se imprime, no se mira en pantalla.** Es el entregable físico del producto: el PNG viene
como data URL, así que descargar es un `<a download>` sin tocar la red, e imprimir usa una hoja
aparte (`.hoja-qr` en `src/styles/index.css`, con `.no-imprimir` para lo que no va al papel).
Al lado del QR se muestra **a dónde apunta**: si `PUBLIC_APP_BASE_URL` del backend está mal, se
ve antes de mandar mil calcos a imprimir.

**Ojo con `PUBLIC_APP_BASE_URL`.** Es lo que se codifica en el QR y tiene que ser la URL **del
frontend**. Venía en `http://localhost:3000` (el backend): un cliente que escaneara ese QR caía
en la API. Quedó corregido en el `.env.dev` del backend; en producción tiene que apuntar al
dominio de la app.

**El QR lleva directo a Google.** `/r/:businessSlug/:campaignSlug` no muestra formulario: hace
`location.replace` a `GET /api/public/r/…` del backend, que cuenta el escaneo y responde `302` al
formulario de reseña de Google. Pedirle al cliente que opine dos veces (acá y en Google) era perderlo
en el segundo paso. El QR impreso sigue apuntando a esta ruta, no a Google, para que los ya impresos
sigan andando y cada escaneo quede contado.

**`replace`, no `assign`, y una sola vez.** Con `replace` el "atrás" desde Google no vuelve a esta
página, así que no la recarga ni cuenta otro escaneo. El efecto tiene un guard de `ref` porque
StrictMode lo corre dos veces, y cada navegación es un escaneo: el test lo verifica. Si a los 4 s la
navegación no arrancó, aparece un link a mano.

**Un solo "no disponible".** Si la campaña no sirve (negocio inexistente, campaña pausada, sucursal
sin link), el backend redirige a `/r/no-disponible`, siempre el mismo mensaje: quien escanea no tiene
por qué saber cuál de los casos fue, y distinguirlos filtraría qué negocios existen. La misma página
responde en `/r/unavailable`; `/r/no-disponible` es un alias permanente (sin redirect) porque el
backend la tiene escrita en su código.

**Rutas en inglés.** Las URLs van en inglés aunque la interfaz esté en español, y salen todas de
`src/app/paths.ts`: nadie arma una ruta a mano. Las excepciones son las del QR (`/r/...`), que las
genera el backend y ya están impresas: no se cambian. Las URLs viejas en español (`/resenas`,
`/campanas`, `/configuracion/...`, `/ingresar`) redirigen a las nuevas desde
`src/app/legacy-routes.tsx`, traduciendo los filtros. Se quitan cuando `GOOGLE_OAUTH_*_URL` apunte a
`/settings/google/callback` en todos los ambientes; antes no, o la conexión con Google cae en un 404.

**Las métricas se conservan.** Cada escaneo suma a `scans` y a `googleClicks` a la vez, encima de lo
que ya había. Las opiniones internas se eliminaron del producto (pantalla, endpoint y contador): con
el QR yendo directo a Google no entran nuevas, y un número congelado solo confundía.

**La página del QR no arrastra el dashboard.** Vive fuera del layout del dashboard, se carga con `lazy` y
tiene su propio chunk (menos de 1 kB). Además, el build separa los vendors (react / router / zod / query) para que
el peso de cada dependencia sea visible en cada build y no un bundle opaco.

**Sin fuentes externas.** La landing se abre con 3G parado en el mostrador: no bloqueamos el primer
pintado esperando un woff2 de otro dominio.

## Lo que falta del lado del backend

Resuelto en octubre de 2026, con su pantalla en el frontend:

- **El límite del QR:** ahora cuenta por IP y campaña, y pasado el límite el backend redirige a `/r/{negocio}/{campaña}/espera`, que reintenta sola. Antes mostraba un JSON de error.
- **Cerrar sesión de verdad:** salir revoca la sesión en el backend (`POST /auth/logout`), y Configuración tiene "Cerrar sesión en todos los dispositivos".
- **Recuperar contraseña:** `/forgot-password` y `/reset-password`, con el link del mail.
- **Equipo e invitaciones:** la tarjeta "Equipo" en Configuración y la pantalla `/invitations`, que funciona con o sin sesión y vuelve después de entrar. Solo se invita a quien ya tiene cuenta.
- **Sin registro público:** las cuentas las da de alta un administrador (`POST /api/admin/users`, ver el README del backend) con una contraseña provisoria. Al entrar con ella, `RequireAuth` manda a `/change-password` hasta que la cambie; es también donde acepta términos y privacidad. `/sign-up` y `/crear-cuenta` redirigen al login. En los mocks, la provisoria es `provisoria-de-prueba`.

Los links de los mails llevan el token después de `#`: `takeHashToken` lo lee y lo saca de la barra de direcciones. En desarrollo, sin proveedor de mail, el link aparece en el log del backend.

Lo que sigue (propuestas de producto y pendientes técnicos) está en `../opinara-backend/FUTURAS-FUNCIONALIDADES.md`. Del lado de la UI, todavía no existen editar el negocio, pausar campañas ni la paginación de negocios, sucursales y campañas.

Y dos cosas que **sí existen** y no estaban en el contrato que me pasaste, por si sirven en otro lado:
`POST /businesses/:urn/locations/:locationUrn/reviews/sync` (sincronizar una sola sucursal) y el
campo `googleReviewUrl` en cada reseña, que la UI usa para el link "Ver en Google".
