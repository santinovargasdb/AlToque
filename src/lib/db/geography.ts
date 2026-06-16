import { customType } from "drizzle-orm/pg-core";

/**
 * Tipo PostGIS `geography(Point, 4326)` para Drizzle.
 *
 * En el modelo de datos lo representamos como `{ lat, lng }`.
 * - Al escribir: enviamos WKT `SRID=4326;POINT(lng lat)` (PostGIS espera lng primero).
 * - Al leer: PostGIS devuelve el punto; las queries de matching
 *   (find_nearby_providers) hacen el cálculo geográfico en SQL, así que
 *   normalmente no necesitamos parsear el binario WKB del lado JS.
 *
 * Para insertar/actualizar usar el helper `pointSql(lng, lat)` (db/index.ts)
 * o setear el valor crudo con `sql\`st_setsrid(st_makepoint(${lng}, ${lat}), 4326)\``.
 */
export type LatLng = { lat: number; lng: number };

export const geographyPoint = customType<{
  data: LatLng;
  driverData: string;
}>({
  dataType() {
    return "geography(Point, 4326)";
  },
  toDriver(value: LatLng): string {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
});
