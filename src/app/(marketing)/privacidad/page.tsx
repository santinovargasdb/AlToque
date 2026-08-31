/* Versión preliminar. Cuando Legales devuelva la versión final, reemplazar el contenido de esta misma página. */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad de AlToque: qué datos recabamos, para qué los usamos y qué derechos tenés sobre ellos.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl font-bold">
        Política de Privacidad de AlToque
      </h1>
      <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
        Versión preliminar sujeta a revisión legal. Última actualización: 31 de
        agosto de 2026.
      </div>
      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
        <h2>1. Quiénes somos</h2>
        <p>
          AlToque es una plataforma que conecta clientes con profesionales de
          oficios verificados. Este documento describe qué datos personales
          recabamos, para qué los usamos, con quién los compartimos y qué
          derechos tenés sobre ellos.
        </p>
        <ul>
          <li>Responsable del tratamiento: AlToque</li>
          <li>Contacto para consultas de privacidad: [email a definir]</li>
          <li>
            Marco normativo: Ley 25.326 de Protección de Datos Personales de
            Argentina y normativa complementaria.
          </li>
        </ul>

        <h2>2. Qué datos recabamos</h2>
        <h3>Datos que nos das directamente:</h3>
        <ul>
          <li>
            Nombre y apellido, dirección de correo electrónico, número de
            teléfono
          </li>
          <li>Foto de perfil (opcional)</li>
          <li>
            Dirección donde se ejecuta un trabajo, cuando generás un pedido
          </li>
          <li>
            Ubicación geográfica base (para profesionales, para hacer matching
            con pedidos cercanos)
          </li>
          <li>
            Documento de identidad (DNI) y selfie de verificación, solo para
            profesionales, para acreditar identidad
          </li>
          <li>
            Descripción y fotos de trabajos, mensajes en el chat, reseñas y
            calificaciones
          </li>
        </ul>
        <h3>Datos que recabamos automáticamente:</h3>
        <ul>
          <li>
            Registros técnicos (IP, tipo de navegador, sistema operativo) para
            seguridad y estabilidad del servicio
          </li>
          <li>
            Cookies y almacenamiento local del navegador, para mantener tu
            sesión iniciada
          </li>
          <li>
            Cuando iniciás sesión con Google, recibimos de Google tu nombre,
            dirección de correo y foto de perfil, según los permisos que
            otorgues en la pantalla de Google
          </li>
        </ul>

        <h2>3. Para qué usamos tus datos</h2>
        <ul>
          <li>
            Prestar el servicio: conectarte con el profesional o cliente
            adecuado, permitir que se comuniquen y coordinen el trabajo
          </li>
          <li>
            Verificar la identidad de los profesionales antes de habilitarlos
            en la plataforma
          </li>
          <li>
            Enviar notificaciones vinculadas a tu actividad en AlToque (nuevo
            pedido, mensaje, actualización de estado)
          </li>
          <li>Cumplir con obligaciones legales cuando corresponda</li>
          <li>
            Mejorar y proteger el servicio (detección de fraude, resolución de
            incidentes)
          </li>
        </ul>
        <p>
          <strong>
            Nunca vendemos ni cedemos tus datos personales a terceros con fines
            publicitarios.
          </strong>
        </p>

        <h2>4. Con quién compartimos tus datos</h2>
        <p>
          Compartimos datos solo con proveedores necesarios para prestar el
          servicio, y únicamente lo mínimo necesario:
        </p>
        <ul>
          <li>
            <strong>Supabase (Estados Unidos):</strong> aloja la base de datos,
            el sistema de autenticación y el almacenamiento de archivos
          </li>
          <li>
            <strong>Google:</strong> cuando iniciás sesión con Google, y para
            funciones de mapas y geolocalización
          </li>
          <li>
            <strong>Vercel (Estados Unidos):</strong> hosting de la aplicación
            web
          </li>
          <li>
            <strong>Mercado Pago (Argentina):</strong> procesamiento de pagos,
            cuando esté activo
          </li>
        </ul>
        <p>
          Entre cliente y profesional se comparte lo necesario para coordinar
          el trabajo: nombre visible, teléfono, dirección del trabajo, y el
          contenido del chat.
        </p>
        <p>
          También podemos entregar información a autoridades cuando exista una
          obligación legal debidamente fundada.
        </p>

        <h2>5. Por cuánto tiempo conservamos tus datos</h2>
        <ul>
          <li>Datos de cuenta y actividad: mientras tu cuenta esté activa</li>
          <li>
            Registros de trabajos y reseñas: hasta 5 años después de finalizado
            el trabajo, para historial y disputas
          </li>
          <li>
            Documentos de verificación (DNI, selfie): mientras el profesional
            esté habilitado; se eliminan al darse de baja o al ser rechazada la
            verificación
          </li>
          <li>Registros técnicos: hasta 12 meses</li>
        </ul>
        <p>
          Si nos pedís que borremos tus datos, los eliminamos salvo cuando
          exista una obligación legal de conservarlos.
        </p>

        <h2>6. Tus derechos</h2>
        <p>Podés en cualquier momento:</p>
        <ul>
          <li>
            <strong>Acceder</strong> a los datos personales que tenemos sobre
            vos
          </li>
          <li>
            <strong>Rectificar</strong> los que estén incompletos, inexactos o
            desactualizados
          </li>
          <li>
            <strong>Solicitar la supresión</strong> de tus datos y el cierre de
            tu cuenta
          </li>
          <li>
            <strong>Oponerte</strong> al tratamiento en los casos previstos por
            la ley
          </li>
          <li>
            <strong>Retirar tu consentimiento</strong> en cualquier momento,
            sin efecto retroactivo
          </li>
        </ul>
        <p>
          Para ejercer estos derechos escribinos a{" "}
          <strong>[email a definir]</strong>. Vamos a responder dentro de los
          plazos que fija la Ley 25.326.
        </p>
        <p>
          Tenés además el derecho a presentar un reclamo ante la{" "}
          <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>,
          autoridad de aplicación de la ley:{" "}
          <a href="https://www.argentina.gob.ar/aaip">
            https://www.argentina.gob.ar/aaip
          </a>
        </p>

        <h2>7. Seguridad</h2>
        <p>
          Usamos medidas técnicas y organizativas razonables para proteger tus
          datos: contraseñas cifradas, transporte HTTPS, control de acceso a la
          base de datos, y políticas de seguridad a nivel de fila (RLS) para
          que un usuario no pueda leer datos de otro. Los documentos sensibles
          (DNI, selfie) se guardan en buckets privados, accesibles solo a los
          procesos de verificación de AlToque.
        </p>
        <p>
          Ninguna medida es infalible. Si detectamos una brecha de seguridad
          que afecte tus datos, te lo notificaremos y actuaremos según
          corresponda.
        </p>

        <h2>8. Menores de edad</h2>
        <p>
          AlToque no está dirigido a menores de 18 años y no recabamos
          deliberadamente datos de menores. Si sos madre, padre o tutor y
          detectás que un menor a tu cargo cargó datos en la plataforma,
          escribinos y los eliminamos.
        </p>

        <h2>9. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política. Cuando el cambio sea significativo,
          te lo vamos a notificar por correo electrónico o dentro de la
          aplicación antes de que entre en vigencia. La versión vigente y su
          fecha se muestran al comienzo de este documento.
        </p>

        <h2>10. Contacto</h2>
        <p>
          Para cualquier consulta sobre privacidad, uso de tus datos, o para
          ejercer tus derechos:
        </p>
        <p>
          <strong>[email a definir]</strong>
        </p>
      </div>
    </section>
  );
}
