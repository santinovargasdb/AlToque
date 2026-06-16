/** Catálogo de oficios para la UI de marketing (espejo de seed-categories.sql). */
export const OFICIOS = [
  { slug: "plomeria", name: "Plomería", icon: "Wrench", urgent: true },
  { slug: "cerrajeria", name: "Cerrajería", icon: "KeyRound", urgent: true },
  { slug: "electricista", name: "Electricista", icon: "Zap", urgent: true },
  { slug: "gasista", name: "Gasista", icon: "Flame", urgent: true },
  { slug: "techista", name: "Techista", icon: "House", urgent: true },
  { slug: "carpinteria", name: "Carpintería", icon: "Hammer", urgent: false },
  { slug: "pintor", name: "Pintor", icon: "Paintbrush", urgent: false },
  { slug: "albanil", name: "Albañil", icon: "BrickWall", urgent: false },
] as const;

export type Oficio = (typeof OFICIOS)[number];
