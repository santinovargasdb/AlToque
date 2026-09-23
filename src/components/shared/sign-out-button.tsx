import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/** Form con server action para logout seguro. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M10.5 11.5 14 8l-3.5-3.5M14 8H6" />
        </svg>
        <span>Salir</span>
      </Button>
    </form>
  );
}
