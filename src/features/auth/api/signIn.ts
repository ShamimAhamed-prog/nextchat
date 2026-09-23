export type SignInPayload = { email: string; password: string };
export type SignInResult = { user: { id: string; email: string; name?: string } };

/** Thrown on a non-2xx response; `status` lets callers branch on 401 vs 5xx. */
export class SignInError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Contract for the backend team — this endpoint doesn't exist yet, so calls
 * here 404 until it ships:
 *
 *   POST /api/auth/sign-in
 *   body:     { email, password }
 *   success:  200 { user } — server also sets a signed httpOnly session
 *             cookie; the client never reads or stores the session itself.
 *   failure:  4xx { message } — shown to the user as the form-level error.
 *
 * Swap the implementation here once the real route exists; call sites
 * (`SignIn`) shouldn't need to change.
 */
export async function signIn(payload: SignInPayload): Promise<SignInResult> {
  const res = await fetch("/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // No/invalid JSON body — fall through to the generic message below.
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Sign in failed. Please check your details and try again.";
    throw new SignInError(message, res.status);
  }

  return data as SignInResult;
}
