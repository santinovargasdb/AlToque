/* Versión preliminar. Cuando Legales devuelva la versión final, reemplazar el contenido de esta misma página. */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos y Condiciones de uso de AlToque: derechos y obligaciones de clientes y profesionales al usar la plataforma.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl font-bold">
        Términos y Condiciones de AlToque
      </h1>
      <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
        Versión preliminar sujeta a revisión legal. Última actualización: 9 de
        septiembre de 2026.
      </div>
      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
        <h2>1. Qué es AlToque</h2>
        <p>
          AlToque es una plataforma web (PWA) que conecta clientes con
          trabajadores de oficios verificados (plomería, electricidad,
          cerrajería, gasistas) para trabajos urgentes o agendados. Estos
          Términos y Condiciones regulan el uso de la plataforma tanto para
          clientes como para profesionales.
        </p>
        <ul>
          <li>Titular del servicio: AlToque</li>
          <li>Contacto: altoquecorp@gmail.com</li>
          <li>
            Marco normativo: legislación de la República Argentina, en especial
            la Ley 24.240 de Defensa del Consumidor, la Ley 25.326 de Protección
            de Datos Personales y normativa complementaria.
          </li>
        </ul>

        <h2>2. Aceptación de los Términos</h2>
        <p>
          Al crear una cuenta, iniciar sesión o utilizar AlToque, aceptás estos
          Términos y Condiciones y nuestra{" "}
          <a href="/privacidad">Política de Privacidad</a>. Si no estás de
          acuerdo con alguna parte, no podés usar la plataforma.
        </p>
        <p>
          Estos Términos aplican por igual a clientes y a profesionales, con
          las secciones específicas que correspondan a cada rol.
        </p>

        <h2>3. Cuenta de usuario</h2>
        <ul>
          <li>
            Para usar AlToque tenés que ser mayor de <strong>18 años</strong> y
            tener capacidad legal para contratar.
          </li>
          <li>
            Podés registrarte iniciando sesión con tu cuenta de Google, o con
            tu correo electrónico y una contraseña. En el segundo caso, la
            contraseña se almacena de forma segura (hasheada, nunca en texto
            plano).
          </li>
          <li>
            La información que cargás en tu perfil (nombre, foto, ubicación,
            teléfono, categorías y zonas de trabajo si sos profesional) debe
            ser veraz, actualizada y no vulnerar derechos de terceros.
          </li>
          <li>
            Sos responsable de mantener la confidencialidad de tu contraseña y
            de toda actividad realizada bajo tu cuenta.
          </li>
          <li>
            Podemos suspender o cancelar cuentas que incumplan estos Términos,
            incluyendo perfiles falsos, duplicados o creados con datos de
            terceros sin autorización.
          </li>
        </ul>

        <h2>4. Cómo funciona la plataforma</h2>
        <p>
          AlToque conecta clientes con profesionales de oficios y facilita la
          comunicación entre las partes. Los flujos principales son:
        </p>
        <ul>
          <li>
            <strong>Servicio agendado:</strong> el cliente busca profesionales
            en una categoría, elige uno y coordina el trabajo por el chat de
            la plataforma.
          </li>
          <li>
            <strong>Urgencia:</strong> el cliente emite un pedido que se envía
            en tiempo real a todos los profesionales activos de esa categoría
            dentro de su radio. El primero que acepta se queda con el trabajo.
          </li>
          <li>
            <strong>Reseñas:</strong> al cerrarse el trabajo, el cliente puede
            dejar puntaje y comentario. La reseña queda pública en el perfil
            del profesional.
          </li>
        </ul>

        <h2>5. Rol de AlToque</h2>
        <p>
          <strong>
            AlToque es un intermediario tecnológico que facilita el contacto
            entre cliente y profesional.
          </strong>{" "}
          No somos parte del contrato de servicio que se acuerda entre ellos.
        </p>
        <ul>
          <li>
            El pago del servicio se acuerda y se ejecuta directamente entre
            cliente y profesional, por fuera de la plataforma. AlToque no
            interviene en esa transacción ni cobra comisión sobre el valor del
            trabajo.
          </li>
          <li>
            AlToque no garantiza la calidad, seguridad ni resultado del trabajo
            realizado por el profesional. La ejecución del trabajo es
            responsabilidad exclusiva del profesional que lo acepta.
          </li>
          <li>
            AlToque verifica la identidad del profesional (DNI, selfie) antes
            de habilitarlo. Esa verificación acredita identidad, no idoneidad
            técnica.
          </li>
        </ul>

        <h2>6. Suscripción del profesional</h2>
        <p>
          Para recibir pedidos y aparecer en las búsquedas, el profesional debe
          contar con una suscripción mensual activa, procesada a través de{" "}
          <strong>Mercado Pago</strong> mediante un plan de{" "}
          <em>preapproval</em> (débito recurrente autorizado).
        </p>
        <ul>
          <li>
            La suscripción se renueva automáticamente cada 30 días mientras esté
            activa.
          </li>
          <li>
            Ante un pago fallido, la cuenta entra en un período de gracia (7
            días) durante el cual el profesional sigue apareciendo en las
            búsquedas y puede actualizar el método de pago. Vencido el período
            de gracia sin resolver el pago, la suscripción pasa al estado
            cancelada y el profesional deja de recibir pedidos hasta que
            reactive.
          </li>
          <li>
            El profesional puede cancelar la suscripción en cualquier momento
            desde el panel de la aplicación. La cancelación se aplica en
            Mercado Pago de inmediato para evitar cobros posteriores. Puede
            elegir entre mantener el acceso hasta el fin del período pagado o
            perder el acceso en el momento.
          </li>
          <li>
            No se realizan devoluciones parciales por días no usados dentro de
            un período ya pagado.
          </li>
          <li>
            El profesional tiene derecho de arrepentimiento conforme a la
            normativa de defensa del consumidor y la Ley 24.240. Puede ejercerlo
            dentro de los 10 días hábiles siguientes al alta de la suscripción
            escribiéndonos a altoquecorp@gmail.com.
          </li>
        </ul>

        <h2>7. Verificación del profesional</h2>
        <p>
          Para poder aparecer en las búsquedas, el profesional debe superar el
          proceso de verificación:
        </p>
        <ul>
          <li>Foto legible del DNI (frente y dorso).</li>
          <li>Selfie sosteniendo el DNI.</li>
          <li>
            Revisión manual por parte del equipo de administración, dentro de
            un plazo estimado de 48 horas hábiles.
          </li>
        </ul>
        <p>
          La documentación se conserva mientras el perfil esté activo y se
          elimina al darse de baja o al ser rechazada la verificación. Ver
          detalles en la <a href="/privacidad">Política de Privacidad</a>.
        </p>

        <h2>8. Conducta prohibida</h2>
        <p>Al usar AlToque no podés:</p>
        <ul>
          <li>
            Suplantar la identidad de otra persona ni crear perfiles con datos
            falsos o de terceros sin autorización.
          </li>
          <li>
            Ofrecer servicios sin contar con la verificación aprobada, o
            hacerlo por fuera del alcance declarado en tu perfil.
          </li>
          <li>
            Usar la plataforma para actividades ilícitas o contrarias a la moral
            y las buenas costumbres.
          </li>
          <li>
            Enviar contenido discriminatorio, ofensivo, amenazante o que viole
            derechos de terceros a través del chat, reseñas o cualquier otro
            canal de la plataforma.
          </li>
          <li>
            Publicar reseñas falsas, manipular reputación, o dejar reseñas por
            trabajos no realizados a través de la plataforma.
          </li>
          <li>
            Intentar acceder de forma no autorizada a la plataforma, otras
            cuentas, o interferir con su funcionamiento (scraping masivo,
            bots, ingeniería inversa, etc.).
          </li>
          <li>
            Usar la plataforma para captar clientes o profesionales con el fin
            de derivarlos a servicios competitivos o evadir la suscripción.
          </li>
        </ul>
        <p>
          El incumplimiento puede resultar en suspensión o cancelación de tu
          cuenta sin devolución del monto proporcional pagado y sin perjuicio
          de las acciones legales que correspondan.
        </p>

        <h2>9. Reseñas y contenido de usuario</h2>
        <p>
          Los usuarios son los únicos responsables por el contenido que
          publican (mensajes de chat, reseñas, fotos, descripciones de
          trabajos). AlToque puede eliminar contenido que viole estos Términos,
          la ley aplicable o los derechos de terceros.
        </p>
        <p>
          Al publicar una reseña le otorgás a AlToque una licencia gratuita,
          no exclusiva y sin plazo para exhibirla dentro de la plataforma. Las
          reseñas son públicas y visibles para cualquier usuario que ingrese
          al perfil del profesional.
        </p>

        <h2>10. Cancelación de cuenta</h2>
        <p>
          Podés dar de baja tu cuenta en cualquier momento escribiéndonos a
          altoquecorp@gmail.com. La eliminación de datos se realiza conforme a
          lo previsto en la <a href="/privacidad">Política de Privacidad</a>,
          respetando los plazos de conservación que exija la normativa fiscal
          y comercial vigente.
        </p>
        <p>
          Si sos profesional y tenés una suscripción activa, la baja de la
          cuenta implica la cancelación de la suscripción.
        </p>

        <h2>11. Modificaciones al servicio</h2>
        <p>
          AlToque puede modificar, suspender o discontinuar total o parcialmente
          el servicio, en cualquier momento, con o sin previo aviso, cuando
          existan razones técnicas, comerciales o legales que lo justifiquen.
          En la medida de lo posible, notificaremos con antelación razonable
          cualquier cambio significativo.
        </p>

        <h2>12. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley aplicable, AlToque no será
          responsable por:
        </p>
        <ul>
          <li>
            Daños derivados de la calidad, ejecución o resultado del trabajo
            realizado por el profesional. La relación contractual del servicio
            es entre cliente y profesional.
          </li>
          <li>
            Contenido publicado por los usuarios en chats, reseñas u otros
            espacios de la plataforma.
          </li>
          <li>
            Interrupciones del servicio por causas ajenas al control razonable
            de AlToque (fallas de proveedores de terceros, caídas de
            infraestructura, eventos de fuerza mayor).
          </li>
          <li>
            Uso indebido de la plataforma por parte de otros usuarios.
          </li>
        </ul>
        <p>
          Nada en estos Términos limita la responsabilidad que no pueda ser
          excluida o limitada según la Ley 24.240 de Defensa del Consumidor.
        </p>

        <h2>13. Propiedad intelectual</h2>
        <p>
          La marca AlToque, el diseño de la plataforma, su código fuente y los
          contenidos que la componen son propiedad de sus titulares y están
          protegidos por la legislación vigente. El acceso a la plataforma no
          otorga ningún derecho de uso sobre esos elementos más allá de la
          navegación normal del servicio.
        </p>
        <p>
          El contenido que subas (fotos de perfil, descripciones, mensajes,
          reseñas) sigue siendo tuyo. Nos otorgás una licencia limitada para
          alojarlo, mostrarlo y transmitirlo dentro de la plataforma con el
          fin de prestar el servicio.
        </p>

        <h2>14. Cambios a estos Términos</h2>
        <p>
          Podemos actualizar estos Términos. Cuando el cambio sea significativo
          te lo notificaremos por correo electrónico o dentro de la aplicación
          antes de que entre en vigencia. Si seguís usando la plataforma
          después de que el cambio entre en vigencia, se entiende que aceptás
          la nueva versión. La versión vigente y su fecha se muestran al
          comienzo de este documento.
        </p>

        <h2>15. Ley aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República Argentina.
          Cualquier controversia derivada del uso de AlToque será resuelta ante
          los tribunales ordinarios con competencia en la Ciudad Autónoma de
          Buenos Aires, sin perjuicio del derecho del consumidor a acudir a la
          jurisdicción que le corresponda conforme a la Ley 24.240.
        </p>

        <h2>16. Contacto</h2>
        <p>
          Para cualquier consulta sobre estos Términos, reportes de conducta
          indebida, o para ejercer tus derechos como usuario:
        </p>
        <p>
          <strong>altoquecorp@gmail.com</strong>
        </p>
      </div>
    </section>
  );
}
