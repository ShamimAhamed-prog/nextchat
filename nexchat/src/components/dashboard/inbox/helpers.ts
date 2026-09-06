// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import type { ActivityEntry } from "./types";

let uid = 0;
export function nid(prefix: string): string {
  uid += 1;
  return `${prefix}${uid}`;
}

export function activity(title: string, detail: string, time = "just now"): ActivityEntry {
  return { id: nid("a"), title, detail, time };
}

export function ago(minutes: number): number {
  return Date.now() - minutes * 60_000;
}
