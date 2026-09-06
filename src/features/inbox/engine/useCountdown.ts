"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Current time, refreshed every `intervalMs` — one shared ticker for
 * SLA-deadline displays across a list, instead of a `useCountdown` per row
 * (those are for second-precision single deadlines like a hold or an
 * offer; SLA badges only need to be fresh to the minute).
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Seconds remaining until `expiresAt`, ticking every second; fires `onExpire` once. */
export function useCountdown(expiresAt: number | undefined, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(() => (expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) : 0));
  const firedRef = useRef(false);

  /*
   * Every call site passes an inline arrow, so `onExpire` is a new function
   * on every render. Listing it as a dependency would restart the interval
   * a second into each countdown; suppressing the lint instead captured the
   * arrow from whichever render last changed `expiresAt`, which is only
   * harmless while the callback closes over nothing that moves. A ref keeps
   * the interval keyed on the deadline alone *and* calls the current
   * callback, so neither trade-off is needed.
   */
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    firedRef.current = false;
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);

  // Derived rather than reset via a second setState call in the effect
  // above (that pattern trips `react-hooks/set-state-in-effect`) — when
  // there's no deadline, the internal `remaining` may still hold a stale
  // value from a previous countdown, so the public return masks it to 0.
  return expiresAt ? remaining : 0;
}
