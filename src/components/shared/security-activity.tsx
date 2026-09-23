import { getRecentSecurityActivity } from "@/lib/audit";
import { parseUserAgent } from "@/lib/security-utils";
import { formatDateTime } from "@/lib/utils";

/** SVG path de cada acción auditada. */
const ACTION_META: Record<
  string,
  { label: string; path: string; tone?: "warning" }
> = {
  login: {
    label: "Inicio de sesión",
    path: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
  },
  failed_login: {
    label: "Intento de ingreso fallido",
    path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    tone: "warning",
  },
  signup: {
    label: "Creación de la cuenta",
    path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6",
  },
  logout: {
    label: "Cierre de sesión",
    path: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  },
  logout_all: {
    label: "Cierre de sesión en todos los dispositivos",
    path: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  },
  password_change: {
    label: "Cambio de contraseña",
    path: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  },
  password_reset_request: {
    label: "Pedido de recuperación de contraseña",
    path: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  },
  identity_link: {
    label: "Vinculación de cuenta de Google",
    path: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  },
  identity_unlink: {
    label: "Desvinculación de cuenta de Google",
    path: "M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10",
    tone: "warning",
  },
  profile_update: {
    label: "Actualización del perfil",
    path: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  },
};

const DEFAULT_PATH =
  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

/**
 * "Actividad de seguridad": últimos eventos del audit trail del usuario
 * (fecha, navegador/OS aproximados desde el user-agent, IP y acción).
 * Server Component: consulta Drizzle directo (patrón de lectura del proyecto).
 */
export async function SecurityActivity({ userId }: { userId: string }) {
  const rows = await getRecentSecurityActivity(userId, 5);

  return (
    <section className="rounded-md border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-heading font-semibold">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        Actividad de seguridad
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
              path: DEFAULT_PATH,
            };
            const device = parseUserAgent(row.userAgent);
            return (
              <li key={row.id} className="flex items-start gap-3 py-2.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`mt-0.5 shrink-0 ${meta.tone === "warning" ? "text-amber-500" : "text-muted-foreground"}`}
                  aria-hidden="true"
                >
                  <path d={meta.path} />
                </svg>
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

