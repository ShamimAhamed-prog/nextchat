/**
 * **This provides no CSRF protection.** A token this file generates, stores
 * and then echoes back in the form it generated it for is validated by
 * nobody — an attacker's page can obtain one the same way. Real protection
 * requires a server that issues the token and rejects submissions carrying
 * the wrong one, and there is no server here.
 *
 * It is kept because the shape is the useful part: the auth forms already
 * render a `_csrf` field, so wiring them to a backend later is a change to
 * this module rather than to every form. Read the filename as "the seam
 * where CSRF will go", never as "CSRF is handled".
 */

const CSRF_TOKEN_KEY = "csrf_token";

/**
 * Storage access, not just storage *reads*, can throw: a browser set to
 * block site data raises on the `sessionStorage` property itself, and
 * `getCsrfToken` is called during render (`SignIn`, `SignUp`), so an
 * unguarded access takes the sign-in page down with it. `ThemeContext`'s
 * pre-paint script wraps its own access for the same reason. Failing to a
 * fresh token is correct here precisely because nothing validates it.
 */
function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Generate a random token. */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Get or create a token, stored in sessionStorage where that is available. */
export function getCsrfToken(): string {
  if (typeof window === "undefined") return "";

  const store = session();
  const existing = store?.getItem(CSRF_TOKEN_KEY);
  if (existing) return existing;

  const token = generateToken();
  try {
    store?.setItem(CSRF_TOKEN_KEY, token);
  } catch {
    // Quota or a private-mode write refusal. The token still works for the
    // lifetime of this render; it simply will not be reused.
  }
  return token;
}

/** Clear the stored token (e.g. on logout). */
export function clearCsrfToken(): void {
  if (typeof window === "undefined") return;
  try {
    session()?.removeItem(CSRF_TOKEN_KEY);
  } catch {
    // Nothing to clear if the store was never reachable.
  }
}

/**
 * Hidden input props for a form.
 * Usage: `<input {...csrfFieldProps()} />`
 */
export function csrfFieldProps(): { name: string; value: string; type: "hidden" } {
  return {
    name: "_csrf",
    value: getCsrfToken(),
    type: "hidden",
  };
}
