import { t } from '@/i18n';

import { LegalHolders, LegalPage, LegalTable } from '../components/legal-page';
import { LEGAL_UPDATED_AT, legalEntity } from '../entity';

const GOOGLE_USER_DATA_POLICY = 'https://developers.google.com/terms/api-services-user-data-policy';
const GOOGLE_PERMISSIONS = 'https://myaccount.google.com/permissions';

/**
 * La política de privacidad. Describe lo que la app hace hoy (lo que guarda el backend y a quién
 * se lo manda): si cambia eso, cambia esta página y su fecha.
 *
 * La sección 3.3 es la que revisa Google al verificar la app: la declaración de Uso Limitado tiene
 * que seguir estando, con el link a su política.
 */
export default function PrivacyRoute() {
  return (
    <LegalPage title={t.legal.privacy} updatedAt={LEGAL_UPDATED_AT}>
      <p>
        Esta política explica qué datos trata Opinara, para qué, con quién los comparte, cuánto tiempo los guarda y cómo
        podés ejercer tus derechos.
      </p>

      <h2 id="responsable">1. Quién es responsable de tus datos</h2>
      <p>
        Los responsables del tratamiento son <LegalHolders />, República Argentina (“Opinara”, “nosotros”).
      </p>
      <p>
        Contacto para todo lo relacionado con privacidad:{' '}
        <a href={`mailto:${legalEntity.contact}`}>{legalEntity.contact}</a>.
      </p>

      <h2 id="servicio">2. Qué es Opinara</h2>
      <p>Opinara es un servicio para comercios. Les permite:</p>
      <ul>
        <li>generar códigos QR que llevan a sus clientes a dejar una reseña en Google;</li>
        <li>medir cuántas veces se escanean esos QR;</li>
        <li>ver y responder las reseñas de Google de sus sucursales desde un solo panel.</li>
      </ul>
      <p>Esta política alcanza a cuatro grupos de personas:</p>
      <ul>
        <li>
          <strong>Usuarios:</strong> dueños de comercios y miembros de sus equipos que tienen una cuenta en Opinara.
        </li>
        <li>
          <strong>Clientes de los comercios:</strong> personas que escanean un QR.
        </li>
        <li>
          <strong>Autores de reseñas:</strong> personas que dejaron una reseña pública en Google sobre un comercio que
          usa Opinara.
        </li>
        <li>
          <strong>Personas que nos contactan:</strong> quienes completan el formulario de contacto de nuestra página
          web o nos escriben por WhatsApp.
        </li>
      </ul>

      <h2 id="datos">3. Qué datos tratamos y para qué</h2>

      <h3>3.1 Datos de tu cuenta</h3>
      <ul>
        <li>
          <strong>Qué datos:</strong> nombre, email y contraseña. La contraseña se guarda cifrada con un algoritmo de
          hash y nunca en texto legible.
        </li>
        <li>
          <strong>Para qué:</strong> crear y mantener tu cuenta, iniciar sesión, recuperar la contraseña y mandarte
          avisos del servicio.
        </li>
      </ul>

      <h3>3.2 Datos de tu comercio</h3>
      <ul>
        <li>
          <strong>Qué datos:</strong> nombre del comercio y logo; sucursales (nombre, dirección e identificador de
          Google Maps); campañas de QR; miembros del equipo y sus roles; invitaciones (el email de la persona invitada).
        </li>
        <li>
          <strong>Para qué:</strong> prestar el servicio.
        </li>
      </ul>

      <h3 id="google">3.3 Datos que recibimos de Google</h3>
      <p>
        Solo los recibimos si conectás tu cuenta de Google Business Profile, con el permiso{' '}
        <code>https://www.googleapis.com/auth/business.manage</code>.
      </p>
      <LegalTable
        head={['Dato', 'Para qué lo usamos']}
        rows={[
          ['Cuentas y sucursales de tu perfil de empresa', 'Que elijas qué sucursales importar a Opinara.'],
          [
            'Reseñas de tus sucursales: texto, calificación, fecha, nombre visible y foto de perfil pública de quien la escribió',
            'Mostrártelas en el panel, filtrarlas, calcular métricas y avisarte de las nuevas.',
          ],
          [
            'Respuestas a esas reseñas',
            'Mostrarlas y permitirte publicarlas, editarlas o borrarlas en Google. Solo publicamos una respuesta cuando vos lo pedís.',
          ],
          [
            'Credenciales de acceso (tokens de OAuth)',
            'Mantener la conexión sin pedirte permiso cada vez. Se guardan cifradas (AES-256-GCM).',
          ],
        ]}
      />
      <p>
        <strong>Uso limitado.</strong> El uso y la transferencia que hace Opinara de la información recibida de las API
        de Google cumplen con la{' '}
        <a href={GOOGLE_USER_DATA_POLICY} target="_blank" rel="noreferrer noopener">
          Política de datos del usuario de los servicios de las API de Google
        </a>
        , incluidos sus requisitos de Uso Limitado. En concreto:
      </p>
      <ul>
        <li>Usamos esos datos solo para dar y mejorar las funciones de Opinara que ves en la aplicación.</li>
        <li>No los vendemos.</li>
        <li>No los usamos para publicidad.</li>
        <li>No los usamos para entrenar modelos de inteligencia artificial.</li>
        <li>
          No los compartimos con terceros, salvo con los proveedores necesarios para prestar el servicio (sección 4) o
          cuando la ley nos obligue.
        </li>
        <li>
          Ninguna persona de Opinara los lee, salvo si nos das tu permiso (por ejemplo, para resolver un problema de
          soporte), por razones de seguridad o por obligación legal.
        </li>
      </ul>

      <h3>3.4 Sugerencias de respuesta con inteligencia artificial</h3>
      <p>
        Si pedís una sugerencia de respuesta, enviamos a nuestro proveedor de inteligencia artificial lo necesario para
        redactarla:
      </p>
      <ul>
        <li>el texto y la calificación de la reseña;</li>
        <li>el nombre de la sucursal;</li>
        <li>el nombre de pila de quien escribió la reseña.</li>
      </ul>
      <p>La sugerencia es solo una propuesta: no se publica hasta que la revisás y la enviás vos.</p>

      <h3>3.5 Escaneos de QR</h3>
      <p>
        Cuando alguien escanea un QR de Opinara, guardamos solo{' '}
        <strong>la campaña y la fecha y hora del escaneo</strong>. No guardamos la IP, el dispositivo, la ubicación ni
        ningún dato que identifique a quien escaneó.
      </p>
      <p>
        Para evitar abusos, podemos usar la dirección IP por unos minutos para limitar la cantidad de escaneos seguidos.
        Esa información no se guarda junto con el escaneo.
      </p>

      <h3>3.6 Datos técnicos y de seguridad</h3>
      <p>
        Nuestros servidores registran datos técnicos de las solicitudes, como la dirección IP, la fecha, la ruta pedida
        y los errores. Los usamos para la seguridad, para prevenir el fraude y para resolver fallas. Se conservan por un
        tiempo limitado.
      </p>

      <h3 id="contacto">3.7 Formulario de contacto y WhatsApp</h3>
      <ul>
        <li>
          <strong>Qué datos:</strong> nombre, email y nombre del comercio. Si querés, también teléfono, ciudad,
          cantidad de sucursales y un mensaje.
        </li>
        <li>
          <strong>Para qué:</strong> responder tu consulta y, si querés usar Opinara, crearte la cuenta. No los usamos
          para mandarte publicidad.
        </li>
        <li>
          <strong>Cómo nos llegan:</strong> el formulario se envía a través de FormSubmit, que lo reenvía a nuestra
          casilla de email (Gmail). Si nos escribís por WhatsApp, la conversación queda en WhatsApp y se rige también
          por sus políticas.
        </li>
      </ul>

      <h2 id="proveedores">4. Con quién compartimos datos</h2>
      <p>Usamos proveedores que tratan datos por cuenta nuestra y solo para prestar el servicio:</p>
      {/* Faltan el hosting del servidor y la base de datos: se suman cuando se elijan, antes de publicar la app. */}
      <LegalTable
        head={['Proveedor', 'Para qué', 'Ubicación']}
        rows={[
          [
            'Google LLC',
            'Business Profile: leer reseñas y sucursales, y publicar respuestas. Gmail: recibir los mensajes de contacto',
            'Estados Unidos',
          ],
          ['Groq, Inc.', 'Redactar las sugerencias de respuesta (sección 3.4)', 'Estados Unidos'],
          ['Resend', 'Enviar emails del servicio: invitaciones y recuperación de contraseña', 'Estados Unidos'],
          ['Cloudflare, Inc.', 'Alojar y servir nuestra página web', 'Estados Unidos'],
          ['FormSubmit', 'Reenviarnos por email el formulario de contacto (sección 3.7)', 'Fuera de Argentina'],
          ['WhatsApp LLC', 'Conversaciones, solo si nos escribís por WhatsApp (sección 3.7)', 'Estados Unidos'],
        ]}
      />
      <p>
        Algunos de estos proveedores están fuera de Argentina, así que hay transferencias internacionales de datos. En
        esos casos exigimos medidas de protección adecuadas, según lo que dispone la Ley 25.326.
      </p>
      <p>No vendemos ni alquilamos datos personales.</p>

      <h2 id="conservacion">5. Cuánto tiempo guardamos los datos</h2>
      <LegalTable
        head={['Datos', 'Cuánto tiempo se guardan']}
        rows={[
          ['Cuenta y comercio', 'Mientras tu cuenta esté activa.'],
          [
            'Conexión con Google',
            <>
              Hasta que la desconectes desde Opinara. Al desconectar, revocamos el permiso en Google y borramos las
              credenciales. También podés revocarlo cuando quieras desde{' '}
              <a href={GOOGLE_PERMISSIONS} target="_blank" rel="noreferrer noopener">
                la configuración de tu cuenta de Google
              </a>
              .
            </>,
          ],
          ['Reseñas y respuestas sincronizadas', 'Mientras tu cuenta esté activa o hasta que pidas que se borren.'],
          ['Sesiones de inicio de sesión', 'Se borran solas cuando vencen.'],
          ['Invitaciones', 'Vencen a los 7 días si no se aceptan.'],
          [
            'Mensajes de contacto',
            'Hasta 12 meses después de la última conversación. Si te creamos una cuenta, pasan a regirse por las filas de arriba.',
          ],
        ]}
      />
      <p>
        <strong>Si pedís que se borre tu cuenta,</strong> en un plazo de 30 días borramos tus datos y los de tu
        comercio, incluidos los datos recibidos de Google. Solo conservamos lo que la ley nos obligue a guardar.
      </p>

      <h2 id="navegador">6. Almacenamiento en tu navegador</h2>
      <p>Opinara no usa cookies de publicidad ni herramientas de analítica de terceros.</p>
      <p>En tu navegador guardamos solo lo necesario para el servicio:</p>
      <ul>
        <li>un identificador de sesión, para que no tengas que iniciar sesión cada vez que abrís la aplicación;</li>
        <li>preferencias de uso.</li>
      </ul>

      <h2 id="seguridad">7. Seguridad</h2>
      <ul>
        <li>Las comunicaciones viajan cifradas (HTTPS).</li>
        <li>Las contraseñas se guardan con hash.</li>
        <li>Las credenciales de Google se guardan cifradas.</li>
        <li>Cada usuario accede solo a los comercios de los que forma parte, según su rol.</li>
      </ul>
      <p>
        Ningún sistema es completamente infalible. Si detectamos un incidente que afecte tus datos, te vamos a avisar.
      </p>

      <h2 id="derechos">8. Tus derechos</h2>
      <p>
        Podés pedir en cualquier momento, escribiendo a{' '}
        <a href={`mailto:${legalEntity.contact}`}>{legalEntity.contact}</a>:
      </p>
      <ul>
        <li>acceder a tus datos;</li>
        <li>rectificarlos o actualizarlos;</li>
        <li>que se borren;</li>
        <li>oponerte a un tratamiento.</li>
      </ul>
      <p>Respondemos dentro de los plazos de la Ley 25.326:</p>
      <ul>
        <li>
          <strong>Acceso:</strong> 10 días corridos.
        </li>
        <li>
          <strong>Rectificación y supresión:</strong> 5 días hábiles.
        </li>
      </ul>
      <p>
        El derecho de acceso es gratuito si lo pedís con intervalos de al menos seis meses, salvo que acredites un
        interés legítimo para hacerlo antes.
      </p>
      <p>
        <strong>Si sos autor de una reseña:</strong> tu reseña es pública en Google, y la mostramos solo al comercio al
        que se la dejaste. Para modificarla o borrarla, hacelo desde Google. Si además querés que la borremos de
        Opinara, escribinos.
      </p>
      <p>
        <strong>AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA.</strong> La Agencia de Acceso a la Información Pública, en
        su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos
        que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia
        de protección de datos personales.
      </p>

      <h2 id="menores">9. Menores de edad</h2>
      <p>
        Opinara está pensado para comercios y no está dirigido a menores de 18 años. No pedimos ni guardamos a sabiendas
        datos de menores en las cuentas de usuario.
      </p>

      <h2 id="cambios">10. Cambios en esta política</h2>
      <p>
        Si cambiamos esta política de forma importante, te avisamos por email o dentro de la aplicación antes de que el
        cambio entre en vigencia. La fecha de la última actualización está al principio de esta página.
      </p>
    </LegalPage>
  );
}
