import { NextResponse, type NextRequest } from "next/server";
import { expireStaleUrgentJobs } from "@/lib/jobs/expire";

/**
 * Vercel Cron: expira pedidos urgentes en broadcast que nadie aceptó.
 * Protegido por CRON_SECRET. Schedule en vercel.json.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireStaleUrgentJobs();

  return NextResponse.json({ expired });
}
