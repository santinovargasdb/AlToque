import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/** Form con server action — funciona como Server Component. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="size-4" />
        Salir
      </Button>
    </form>
  );
}
