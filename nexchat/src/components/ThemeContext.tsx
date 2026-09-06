"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { HEADER_CONTROL } from "./workspaceChrome";

/**
 * Light and dark for the agent workspace.
 *
 * Scope is deliberate: the provider is mounted in the `(workspace)` layout,
 * not the root one, so `/inbox`, `/dashboard`, `/admin` and the supervisor
 * views can be either theme while the marketing pages stay the dark-only
 * design they were built as. `data-theme` is removed on unmount, so
 * navigating from a light inbox back to `/` does not leave the landing page
 * wearing a palette its glows and gradients were never drawn for.
 *
 * Every colour those screens use comes from a token in `globals.css`, so
 * switching is one attribute on `<html>` — no component re-renders to change
 * colour, and no component needs to know the theme exists.
 */
export type Theme = "dark" | "light";

const STORAGE_KEY = "takeoff.theme";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };

const ThemeContext = createContext<Ctx | null>(null);

/**
 * Same external-store shape as `UiLocaleProvider`: `localStorage` is read
 * through `useSyncExternalStore` rather than copied into state by a mount
 * effect, which would set state during an effect and cascade a second
 * render. The server snapshot is `dark`, which is also the default.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    // Private mode or blocked storage — dark is the default anyway.
    return "dark";
  }
}

function writeTheme(t: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // Not being able to remember the choice is not worth failing over.
  }
  listeners.forEach((cb) => cb());
}

/**
 * Applies the stored theme during HTML parse, before the browser paints.
 * Without it a light-theme user gets a dark flash on every navigation into
 * the workspace, because the server has no way to know their preference and
 * React only reaches the effect below after hydration.
 *
 * Rendered by the provider rather than by the root layout so it is scoped to
 * the workspace routes, the same as the provider itself.
 */
const PREPAINT = `document.documentElement.dataset.app="workspace";try{if(localStorage.getItem("${STORAGE_KEY}")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);
  const setTheme = useCallback((t: Theme) => writeTheme(t), []);
  const toggle = useCallback(() => writeTheme(readTheme() === "light" ? "dark" : "light"), []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  /**
   * `data-app` marks the workspace routes for the handful of rules that
   * belong to the application chrome rather than the marketing site — the
   * Inter type stack, today. Separate from `data-theme` because it is not a
   * preference: it is which product you are looking at, and it is set once
   * on mount rather than tracked.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.app = "workspace";
    return () => {
      delete root.dataset.app;
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  // Forgiving in the same way `useUiLocale` is: a component rendered outside
  // the workspace reports dark and its toggle does nothing, rather than
  // throwing on a marketing page.
  return ctx ?? { theme: "dark", setTheme: () => {}, toggle: () => {} };
}

/**
 * Sits beside the notifications bell in both headers.
 *
 * It renders *both* glyphs and lets CSS reveal the right one from
 * `:root[data-theme]` — see the note in `globals.css`. Reading the theme in
 * render instead would mean the server (always dark) and a light-theme
 * client disagreeing on the markup, which is exactly the hydration mismatch
 * the pre-paint script exists to avoid causing visually.
 *
 * For the same reason the accessible name is static rather than "Switch to
 * light" / "Switch to dark": a name that depends on the theme is a name that
 * differs between the server and the client. The button is a toggle, and
 * "Toggle light and dark theme" is true in both positions.
 *
 * The shape comes from `HEADER_CONTROL`, shared with the bell beside it.
 */
export function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle light and dark theme"
      aria-label="Toggle light and dark theme"
      className={HEADER_CONTROL}
    >
      <svg viewBox="0 0 24 24" className="theme-icon-moon h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 13.4A8.4 8.4 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="theme-icon-sun h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    </button>
  );
}
