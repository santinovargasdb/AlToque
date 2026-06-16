import type { Metadata } from "next";
import { RegistroFlow } from "@/components/auth/registro-flow";
import type { Role } from "@/lib/auth";

export const metadata: Metadata = { title: "Registro" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string }>;
}) {
  const { rol } = await searchParams;
  const initialRole: Role | undefined =
    rol === "provider" || rol === "client" ? rol : undefined;

  return <RegistroFlow initialRole={initialRole} />;
}
