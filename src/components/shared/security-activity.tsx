import { ShieldCheck, ShieldAlert, KeyRound, LogIn, LogOut, UserPen, Link2, Unlink } from "lucide-react";
import { getRecentSecurityActivity } from "@/lib/audit";
import { parseUserAgent } from "@/lib/security-utils";
import { formatDateTime } from "@/lib/utils";

/** Etiqueta e ícono de cada acción auditada (fallback genérico). */
const ACTION_META: Record<string, { label: string; Icon: typeof LogIn; tone?: "warning" }> = {
  login: { label: "Inicio de sesión", Icon: LogIn },
  failed_login: { label: "Intento de ingreso fallido", Icon: ShieldAlert, tone: "warning" },
  signup: { label: "Creación de la cuenta", Icon: UserPen },
  logout: { label: "Cierre de sesión", Icon: LogOut },
  logout_all: { label: "Cierre de sesión en todos los dispositivos", Icon: LogOut },
  password_change: { label: "Cambio de contraseña", Icon: KeyRound },
  password_reset_request: { label: "Pedido de recuperación de contraseña", Icon: KeyRound },
  identity_link: { label: "Vinculación de cuenta de Google", Icon: Link2 },
  identity_unlink: { label: "Desvinculación de cuenta de Google", Icon: Unlink, tone: "warning" },
  profile_update: { label: "Actualización del perfil", Icon: UserPen },
};

/**
 * "Actividad de seguridad": últimos eventos del audit trail del usuario
 * (fecha, navegador/OS aproximados desde el user-agent, IP y acción).
 * Server Component: consulta Drizzle directo (patrón de lectura del proyecto).
 */
export async function SecurityActivity({ userId }: { userId: string }) {
  const rows = await getRecentSecurityActivity(userId, 5);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-heading font-semibold">
        <ShieldCheck className="size-4 text-success" /> Actividad de seguridad
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Todavía no hay actividad registrada. Acá vas a ver tus últimos
          inicios de sesión y cambios importantes de la cuenta.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((row) => {
            const meta = ACTION_META[row.action] ?? {
              label: row.action,
              Icon: ShieldCheck,
            };
            const device = parseUserAgent(row.userAgent);
            return (
              <li key={row.id} className="flex items-start gap-3 py-2.5">
                <meta.Icon
                  className={`mt-0.5 size-4 shrink-0 ${meta.tone === "warning" ? "text-warning" : "text-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {device.browser} · {device.os}
                    {row.ipAddress ? ` · IP ${row.ipAddress}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
