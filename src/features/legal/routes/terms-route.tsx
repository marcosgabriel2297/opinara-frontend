import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { t } from '@/i18n';

import { LegalHolders, LegalPage } from '../components/legal-page';
import { LEGAL_UPDATED_AT, legalEntity } from '../entity';

const GOOGLE_CONTENT_POLICY = 'https://support.google.com/contributionpolicy/answer/7400114';

/**
 * Los términos y condiciones. La sección 4 repite las reglas de Google sobre reseñas (sin
 * incentivos, sin filtrar insatisfechos): Google las mira al aprobar el acceso a su API.
 */
export default function TermsRoute() {
  return (
    <LegalPage title={t.legal.terms} updatedAt={LEGAL_UPDATED_AT}>
      <p>
        Estos términos regulan el uso de Opinara, el servicio que prestan <LegalHolders />, República Argentina
        (“Opinara”, “nosotros”). Si creás una cuenta o usás el servicio, aceptás estos términos y la{' '}
        <Link to={paths.privacy}>Política de privacidad</Link>.
      </p>

      <h2 id="servicio">1. El servicio</h2>
      <p>Opinara permite a los comercios:</p>
      <ul>
        <li>crear campañas con códigos QR que llevan a sus clientes a dejar una reseña en Google;</li>
        <li>medir los escaneos de esos QR;</li>
        <li>conectar su perfil de Google Business Profile para ver y responder sus reseñas desde un panel;</li>
        <li>recibir sugerencias de respuesta redactadas con inteligencia artificial.</li>
      </ul>
      <p>
        Podemos agregar, cambiar o quitar funciones. Si un cambio afecta de forma importante algo que usás, te avisamos
        con anticipación razonable.
      </p>

      <h2 id="cuenta">2. Tu cuenta</h2>
      <ul>
        <li>
          Para usar Opinara tenés que ser mayor de 18 años y tener capacidad para contratar. Si actuás en nombre de un
          comercio, tenés que estar autorizado por ese comercio.
        </li>
        <li>Los datos que cargues tienen que ser reales y estar actualizados.</li>
        <li>
          Sos responsable de cuidar tu contraseña y de lo que se haga desde tu cuenta. Si sospechás que alguien entró
          sin permiso, avisanos.
        </li>
        <li>
          <strong>Equipo:</strong> el dueño de un comercio puede invitar a otras personas y asignarles un rol. El dueño
          es responsable de a quién da acceso y con qué permisos.
        </li>
      </ul>

      <h2 id="google">3. Conexión con Google</h2>
      <ul>
        <li>
          Solo podés conectar perfiles de Google Business Profile que administres o estés autorizado a administrar.
        </li>
        <li>
          Al conectar, autorizás a Opinara a leer tus sucursales y reseñas y a publicar, editar o borrar respuestas{' '}
          <strong>cuando vos lo pidas</strong>.
        </li>
        <li>Podés desconectar la cuenta de Google en cualquier momento, desde Opinara o desde tu cuenta de Google.</li>
        <li>
          Opinara depende de los servicios y las API de Google, que Google puede cambiar, limitar o suspender. No somos
          responsables por esas interrupciones ni por las decisiones de Google sobre tu perfil o tus reseñas.
        </li>
        <li>El uso de Google Business Profile está sujeto también a los términos y políticas de Google.</li>
      </ul>

      <h2 id="resenas">4. Uso correcto: reglas sobre reseñas</h2>
      <p>
        Las reseñas tienen que reflejar experiencias reales. Al usar Opinara, te comprometés a respetar las{' '}
        <a href={GOOGLE_CONTENT_POLICY} target="_blank" rel="noreferrer noopener">
          políticas de contenido de Google
        </a>
        . En particular, <strong>no podés</strong>:
      </p>
      <ul>
        <li>
          ofrecer descuentos, regalos, dinero u otros beneficios a cambio de dejar una reseña, ni a cambio de cambiarla
          o borrarla;
        </li>
        <li>
          pedir reseñas solo a los clientes satisfechos o filtrar a los insatisfechos antes de que lleguen a Google;
        </li>
        <li>publicar o encargar reseñas falsas, ni reseñas sobre tu propio comercio o el de la competencia;</li>
        <li>usar Opinara para acosar, discriminar o publicar contenido ilegal u ofensivo en las respuestas;</li>
        <li>
          intentar acceder a datos de otros comercios, vulnerar la seguridad del servicio o usarlo de forma automatizada
          abusiva.
        </li>
      </ul>
      <p>
        Si incumplís estas reglas, podemos suspender o cerrar tu cuenta. Google también puede tomar medidas sobre tu
        perfil, como borrar reseñas o restringir tu perfil.
      </p>

      <h2 id="ia">5. Sugerencias con inteligencia artificial</h2>
      <p>
        Las sugerencias de respuesta son propuestas generadas de forma automática y pueden contener errores o no ser
        adecuadas para tu caso. <strong>Vos decidís qué se publica:</strong> nada se envía a Google sin tu confirmación,
        y sos responsable del contenido de las respuestas que publicás.
      </p>

      <h2 id="qr">6. Códigos QR y sucursales</h2>
      <p>
        Sos responsable de verificar que cada sucursal, y su enlace de reseña, corresponda a tu comercio antes de
        imprimir y distribuir los QR. Opinara no responde por los costos de impresión ni por los QR que lleven a un
        lugar equivocado por datos mal cargados.
      </p>
      <p>Si tu cuenta se cierra, los QR dejan de funcionar.</p>

      <h2 id="precio">7. Precio</h2>
      <p>Mientras Opinara esté en etapa de prueba, el servicio es gratuito.</p>
      <p>
        Si en el futuro el servicio pasa a tener costo, te vamos a informar el precio y las condiciones antes de
        cobrarte. Vos podés decidir si seguís usándolo.
      </p>

      <h2 id="contenido">8. Tu contenido</h2>
      <p>
        El contenido que cargás sigue siendo tuyo: logo, nombres, respuestas y otros datos de tu comercio. Nos das
        permiso para usarlo solo en la medida necesaria para prestar el servicio.
      </p>
      <p>
        El nombre, la marca, el diseño y el software de Opinara son nuestros. Estos términos no te dan ningún derecho
        sobre ellos, más allá de usar el servicio.
      </p>

      <h2 id="responsabilidad">9. Disponibilidad y responsabilidad</h2>
      <ul>
        <li>
          Hacemos lo posible para que Opinara funcione de forma continua y segura, pero puede haber interrupciones por
          mantenimiento, fallas técnicas o problemas de terceros (Google, proveedores de hosting o de inteligencia
          artificial).
        </li>
        <li>
          El servicio se ofrece “tal como está”. No garantizamos una cantidad de reseñas, una calificación determinada
          ni un resultado comercial.
        </li>
        <li>
          En la medida que lo permita la ley, no respondemos por daños indirectos ni por lucro cesante. Nuestra
          responsabilidad total queda limitada a lo que hayas pagado por el servicio en los 12 meses anteriores al
          hecho.
        </li>
        <li>
          Nada de esto limita los derechos que te correspondan como consumidor según la Ley 24.240 de Defensa del
          Consumidor, cuando sea aplicable.
        </li>
      </ul>

      <h2 id="baja">10. Baja y suspensión</h2>
      <ul>
        <li>
          <strong>Si querés irte:</strong> podés dejar de usar Opinara y pedir que borremos tu cuenta cuando quieras,
          escribiendo a <a href={`mailto:${legalEntity.contact}`}>{legalEntity.contact}</a>. Los datos se tratan según
          la <Link to={paths.privacy}>Política de privacidad</Link>.
        </li>
        <li>
          <strong>Si incumplís estos términos:</strong> podemos suspender o cerrar tu cuenta. Si la falta no es grave,
          te avisamos antes para que puedas corregirla.
        </li>
      </ul>

      <h2 id="cambios">11. Cambios en estos términos</h2>
      <p>
        Si cambiamos estos términos de forma importante, te avisamos por email o dentro de la aplicación con al menos 15
        días de anticipación. Si seguís usando Opinara después de esa fecha, aceptás los nuevos términos. Si no estás de
        acuerdo, podés darte de baja.
      </p>

      <h2 id="jurisdiccion">12. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto, son competentes los
        tribunales ordinarios con competencia en <strong>{legalEntity.jurisdiction}</strong>, salvo que la ley de
        defensa del consumidor disponga otra cosa.
      </p>

      <h2 id="contacto">13. Contacto</h2>
      <p>
        Por consultas sobre estos términos, escribinos a{' '}
        <a href={`mailto:${legalEntity.contact}`}>{legalEntity.contact}</a>.
      </p>
    </LegalPage>
  );
}
