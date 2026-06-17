import "server-only";
import { MercadoPagoConfig } from "mercadopago";

/**
 * Config del SDK de MP usando el access token de AlToque (cuenta marketplace).
 * Lee process.env directo (sin lib/env) para no acoplar los módulos de pago a
 * la validación global; lanza un error claro si falta el token cuando se usa.
 */
export function mpConfig(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no configurado: pagos no disponibles.");
  }
  return new MercadoPagoConfig({ accessToken });
}
