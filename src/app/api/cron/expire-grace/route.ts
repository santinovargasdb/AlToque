import { NextResponse, type NextRequest } from "next/server";
import { expireGracePeriods } from "@/lib/actions/subscription";

/**
 * Vercel Cron: aplica el período de gracia de las suscripciones (spec §6).
 * Mueve `active` con período vencido → `past_due` (gate abierto) y `past_due`
 * pasados los días de gracia → `cancelled` (gate cerrado). Protegido por
 * CRON_SECRET; schedule en vercel.json.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireGracePeriods();
  return NextResponse.json(result);
}
