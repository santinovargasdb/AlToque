/**
 * Helper isomórfico (NO `server-only`): lo usa el componente cliente de
 * suscripción. Convierte la VAPID public key (base64url) al `Uint8Array`
 * que espera `PushManager.subscribe({ applicationServerKey })`.
 */
export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
