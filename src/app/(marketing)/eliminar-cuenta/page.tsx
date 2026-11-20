import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Eliminar tu cuenta",
  description:
    "Cómo eliminar tu cuenta de AlToque y qué pasa con tus datos cuando lo hacés.",
  alternates: { canonical: "/eliminar-cuenta" },
};

/**
 * Página pública que exige Google Play: explica cómo pedir la baja de la
 * cuenta sin necesidad de tener la app instalada.
 */
export default function EliminarCuentaPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl font-bold">
        Eliminar tu cuenta de AlToque
      </h1>
      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
        <h2>Desde la app</h2>
        <ol>
          <li>
            <Link href="/ingresar">Ingresá</Link> con tu cuenta.
          </li>
          <li>
            Abrí <strong>Perfil</strong>.
          </li>
          <li>
            Al final de la pantalla tocá <strong>Eliminar mi cuenta</strong> y
            confirmá.
          </li>
        </ol>
        <p>
          La baja es inmediata y no se puede deshacer. Si tenés un trabajo en
          curso, primero hay que terminarlo o cancelarlo.
        </p>

        <h2>Si no podés ingresar</h2>
        <p>
          Escribinos a <strong>altoquecorp@gmail.com</strong> desde el correo
          con el que te registraste, con el asunto &quot;Eliminar cuenta&quot;.
          Lo resolvemos dentro de los plazos que fija la Ley 25.326.
        </p>

        <h2>Qué se borra</h2>
        <ul>
          <li>Tu nombre, teléfono, foto de perfil y métodos de acceso.</li>
          <li>
            Si sos profesional: tu DNI, selfie y matrícula, tu descripción, tu
            zona de trabajo y tus oficios. Dejás de aparecer en las búsquedas.
          </li>
          <li>Tus notificaciones y los permisos de avisos en tus dispositivos.</li>
          <li>
            Tu suscripción, si tenés una: se cancela en Mercado Pago y no se
            vuelve a cobrar.
          </li>
        </ul>

        <h2>Qué se conserva</h2>
        <ul>
          <li>
            Los trabajos ya realizados, sus mensajes y sus reseñas, hasta 5
            años, porque también forman parte del historial de la otra persona.
            Quedan sin tu nombre: figuran como &quot;Usuario eliminado&quot;.
          </li>
          <li>
            Los registros técnicos de seguridad (por ejemplo, la IP de un
            inicio de sesión), hasta 12 meses.
          </li>
        </ul>
        <p>
          Más detalle en nuestra{" "}
          <Link href="/privacidad">Política de Privacidad</Link>.
        </p>
      </div>
    </section>
  );
}
