import Image from "next/image";
import { signInWithGoogle } from "../actions/sign-in";
import { SubmitButton } from "./submit-button";

/**
 * "Continue with Google": its own <form> posting to signInWithGoogle.
 * callbackUrl travels in a hidden input; the server action validates it.
 */
export function GoogleButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <form action={signInWithGoogle} className="w-full">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <SubmitButton variant="outline" size="lg" pendingLabel="Opening Google…">
        <Image src="/images/auth/google-g.svg" alt="" width={18} height={18} />
        Continue with Google
      </SubmitButton>
    </form>
  );
}

/** The "or continue with" divider between the email form and Google. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-3" role="separator" aria-label={label}>
      <span aria-hidden="true" className="h-px flex-1 bg-foreground-subtle" />
      <span aria-hidden="true" className="text-nav text-foreground-muted">
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-foreground-subtle" />
    </div>
  );
}
