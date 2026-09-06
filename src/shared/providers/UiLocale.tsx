"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * NFR-15 asks for a Bangla *and* English UI, not only Bangla content. The
 * customer widget already replies in the customer's language; this is the
 * other half — the application chrome an agent works in all day.
 *
 * Scope, stated plainly: the agent workspace (`/inbox`) is translated,
 * because that is the P0 workflow the PRD gates on. `/dashboard` and
 * `/admin` stay English until their strings are reviewed, rather than
 * shipping a half-Bangla screen that reads worse than a consistent English
 * one. Missing keys fall back to English by construction — `t()` returns the
 * English string when a Bangla one is absent, so an untranslated screen
 * degrades instead of showing a key.
 *
 * **Every Bangla string below is AI-drafted and has not been reviewed by a
 * native speaker.** That is the same standing caveat the widget's Bangla
 * carries (see the gaps list in TODO.md) and it applies just as much here:
 * this is a working i18n layer with draft content in it, not finished copy.
 *
 * TODO: Flag all Bangla strings for native-speaker review (§E4).
 *       All strings marked with [ REVIEW ] need verification.
 */
export type UiLocale = "en" | "bn";

const STORAGE_KEY = "takeoff.uiLocale";

/**
 * English is the key. That keeps the call sites readable (`t("Resolve…")`
 * rather than `t("chat.actions.resolve")`) and means a string with no Bangla
 * yet renders correctly in English instead of rendering an identifier.
 */
const BN: Record<string, string> = {
  // TODO: ALL Bangla strings below are AI-drafted and need native-speaker review (§E4).
  // Flag with [ REVIEW ] for tracking. Do not ship to production without verification.

  // Shell and navigation
  "Support Inbox": "সাপোর্ট ইনবক্স",
  Dashboard: "ড্যাশবোর্ড",
  Tickets: "টিকিট",
  Inbox: "ইনবক্স",
  Settings: "সেটিংস",
  Notifications: "নোটিফিকেশন",
  "Simulate disruption": "বিঘ্ন সিমুলেট করুন",

  // Agent states
  Available: "উপলব্ধ",
  Busy: "ব্যস্ত",
  "Wrap-up": "গুছিয়ে নেওয়া",
  Away: "অনুপস্থিত",
  "On break": "বিরতিতে",
  Training: "প্রশিক্ষণে",
  Offline: "অফলাইন",
  "Receives new work": "নতুন কাজ পাবেন",
  "Receives work while capacity remains": "সক্ষমতা থাকা পর্যন্ত কাজ পাবেন",
  "No new work — finishing notes": "নতুন কাজ নয় — নোট শেষ করছেন",
  "No new work": "নতুন কাজ নয়",
  "Approved queues only": "শুধু অনুমোদিত সারি",
  "No routing": "কোনো রাউটিং নয়",

  // Inbox views
  All: "সব",
  Unassigned: "বণ্টন হয়নি",
  "Assigned to me": "আমার দায়িত্বে",
  "Team queues": "টিম সারি",
  "SLA risk": "এসএলএ ঝুঁকি",
  "Priority incidents": "অগ্রাধিকার ঘটনা",
  "Waiting customer": "গ্রাহক অপেক্ষমাণ",
  Snoozed: "স্নুজ করা",
  "Recently resolved": "সম্প্রতি সমাধান",
  "Inbox views": "ইনবক্স ভিউ",

  // Channels
  "All Conversations": "সব কথোপকথন",
  Website: "ওয়েবসাইট",

  // Ticket list
  "Name, PNR, phone, payment ref…": "নাম, পিএনআর, ফোন, পেমেন্ট রেফ…",
  "Narrow with": "সংকুচিত করুন:",
  "in this view": "এই ভিউতে",
  "No conversations match this filter.": "এই ফিল্টারে কোনো কথোপকথন নেই।",

  // Conversation
  "Back to conversation list": "কথোপকথন তালিকায় ফিরুন",
  Details: "বিস্তারিত",
  "Close details": "বিস্তারিত বন্ধ করুন",
  "Conversation options": "কথোপকথন অপশন",
  "You're in control — AI is silent on this thread until you release it.":
    "আপনি নিয়ন্ত্রণে — আপনি ছেড়ে না দেওয়া পর্যন্ত এই থ্রেডে এআই নীরব।",
  Accept: "গ্রহণ",
  Decline: "প্রত্যাখ্যান",
  "AI Reply": "এআই উত্তর",
  "Send reply": "উত্তর পাঠান",
  "Attach file": "ফাইল সংযুক্ত করুন",
  "Attach image": "ছবি সংযুক্ত করুন",
  "Insert emoji": "ইমোজি যোগ করুন",
  "Free replies are closed on this channel": "এই চ্যানেলে খোলা উত্তর বন্ধ",
  "Transfer…": "হস্তান্তর…",
  "Resolve…": "সমাধান…",
  "Snooze…": "স্নুজ…",
  "Release to AI": "এআই-কে ফিরিয়ে দিন",
  "Approved templates": "অনুমোদিত টেমপ্লেট",
  Queued: "সারিতে",
  Sent: "পাঠানো",
  Delivered: "পৌঁছেছে",
  Read: "পড়া হয়েছে",
  "Not delivered": "পৌঁছায়নি",
  Retrying: "পুনরায় চেষ্টা",
  Retry: "আবার চেষ্টা",

  // Details panel
  "AI handoff summary": "এআই হস্তান্তর সারাংশ",
  "Booking actions": "বুকিং কার্যক্রম",
  "Routing decision": "রাউটিং সিদ্ধান্ত",
  Knowledge: "নলেজ",
  "Keyboard shortcuts": "কীবোর্ড শর্টকাট",
  "Press ? for shortcuts": "শর্টকাটের জন্য ? চাপুন",
  "They are ignored while you are typing in a field.": "কোনো ঘরে লেখার সময় এগুলো কাজ করে না।",
  "Next / previous conversation": "পরবর্তী / পূর্ববর্তী কথোপকথন",
  "Search conversations": "কথোপকথন খুঁজুন",
  "Accept the offered conversation": "প্রস্তাবিত কথোপকথন গ্রহণ করুন",
  "Resolve the open conversation": "খোলা কথোপকথন সমাধান করুন",
  "Show this list": "এই তালিকা দেখান",
  "Close a dialog": "ডায়ালগ বন্ধ করুন",
  Reply: "উত্তর",
  "Internal note": "অভ্যন্তরীণ নোট",
  "Composer mode": "কম্পোজার মোড",
  "Add internal note": "অভ্যন্তরীণ নোট যোগ করুন",
  "Internal note — @mention a colleague to notify them":
    "অভ্যন্তরীণ নোট — সহকর্মীকে জানাতে @মেনশন করুন",
  "Saved replies": "সংরক্ষিত উত্তর",
  "Mention a colleague": "সহকর্মীকে মেনশন করুন",
  "Follow-ups": "ফলো-আপ",
  Identity: "পরিচয়",
  "Set identity status": "পরিচয় অবস্থা নির্ধারণ",
  "Not verified": "যাচাই হয়নি",
  "Check in progress": "যাচাই চলছে",
  Verified: "যাচাই হয়েছে",
  Mismatch: "অমিল",
  "is viewing this conversation": "এই কথোপকথন দেখছেন",
  "is typing on this conversation": "এই কথোপকথনে লিখছেন",
  Pin: "পিন",
  Unpin: "পিন সরান",
  "What needs doing": "কী করতে হবে",
  Owner: "দায়িত্বে",
  "Due in": "সময়সীমা",
  "Add follow-up": "ফলো-আপ যোগ করুন",
  "Cancel follow-up": "ফলো-আপ বাতিল",
  "Save follow-up": "ফলো-আপ সংরক্ষণ",
  "Add tag": "ট্যাগ যোগ করুন",
  "No follow-ups on this conversation.": "এই কথোপকথনে কোনো ফলো-আপ নেই।",
  due: "সময়",
  "Bot cited": "বট উদ্ধৃত করেছে",
  "Search approved knowledge…": "অনুমোদিত নলেজ খুঁজুন…",
  "Nothing in approved knowledge matches that.": "অনুমোদিত নলেজে এর সাথে কিছু মেলেনি।",
  Insert: "যোগ করুন",
  "Insert in Bangla": "বাংলায় যোগ করুন",
  "Inserting puts the text in your composer. Nothing is sent until you send it.":
    "যোগ করলে লেখাটি আপনার কম্পোজারে বসবে। আপনি না পাঠানো পর্যন্ত কিছুই যাবে না।",
  "Showing the article the bot cited on this conversation. Search to see everything.":
    "এই কথোপকথনে বট যে নিবন্ধটি উদ্ধৃত করেছে সেটি দেখানো হচ্ছে। সব দেখতে খুঁজুন।",
  Translate: "অনুবাদ",
  "Hide translation": "অনুবাদ লুকান",
  "Ticket Details": "টিকিট বিবরণ",
  Status: "অবস্থা",
  Priority: "অগ্রাধিকার",
  "Escalation reason": "এসকেলেশনের কারণ",
  "Contact Information": "যোগাযোগের তথ্য",
  Tags: "ট্যাগ",
  Add: "যোগ করুন",
  "Activity Summary": "কার্যক্রম সারাংশ",
  "Connected channels": "সংযুক্ত চ্যানেল",
  Reveal: "দেখান",
  Hide: "লুকান",
  Language: "ভাষা",
  Payment: "পেমেন্ট",
  "Booking state": "বুকিং অবস্থা",
  "Last intents": "সাম্প্রতিক ইনটেন্ট",
  "Nothing selected.": "কিছু নির্বাচন করা হয়নি।",
  "Select a conversation to view it here.": "দেখতে একটি কথোপকথন নির্বাচন করুন।",

  // Ticket rows
  Offered: "প্রস্তাবিত",
  "Assigned to you": "আপনার দায়িত্বে",
  Resolved: "সমাধান হয়েছে",
  "SLA due in": "এসএলএ বাকি",
  "SLA breached": "এসএলএ লঙ্ঘিত",
  ago: "আগে",
  m: "মি",
  h: "ঘ",

  // Booking actions
  "Retry ticketing": "টিকেটিং আবার চেষ্টা করুন",
  "Resend ticket": "টিকিট আবার পাঠান",
  "Rebook at current fare": "বর্তমান ভাড়ায় পুনরায় বুক করুন",
  "Start refund": "রিফান্ড শুরু করুন",
  "Needs approval": "অনুমোদন প্রয়োজন",
  "Every action here confirms first and runs under an idempotency key — the same key can only take effect once.":
    "এখানে প্রতিটি কাজ আগে নিশ্চিত করা হয় এবং একটি আইডেমপোটেন্সি কী দিয়ে চলে — একই কী একবারই কার্যকর হতে পারে।",

  // Shared actions
  Cancel: "বাতিল",
  Close: "বন্ধ",

  // Dashboard & Admin navigation (§B2 — flagged for native-speaker review)
  // TODO: ALL Bangla strings below are AI-drafted and need native-speaker review.
  "Agent workspace": "এজেন্ট ওয়ার্কস্পেস",
  Supervisor: "সুপারভাইজার",
  Platform: "প্ল্যাটফর্ম",
  "Active workload": "সক্রিয় ওয়ার্কলোড",
  "Human performance": "মানুষের কার্যক্ষমতা",
  "AI performance": "এআই কার্যক্ষমতা",
  "Queue control": "কিউ নিয়ন্ত্রণ",
  Alerts: "সতর্কতা",
  Administration: "প্রশাসন",
  Exceptions: "ব্যতিক্রম",
  "QA & coaching": "কুয়ালিটি অ্যাসুরেন্স ও কোচিং",
  "KPI & exports": "কেপিআই ও এক্সপোর্ট",
  "Upgrade Plan": "প্ল্যান আপগ্রেড করুন",

  // Dashboard core
  Draft: "খসড়া",
  "Shared location": "শেয়ার করা অবস্থান",
  "Internal note — not sent to the customer": "অভ্যন্তরীণ নোট — গ্রাহককে পাঠানো হয়নি",
  "New assignment": "নতুন বরাদ্দ",
  "No eligible agent": "কোনো যোগ্য এজেন্ট নেই",
  "Close record": "রেকর্ড বন্ধ করুন",
  Answered: "উত্তর দেওয়া হয়েছে",
  "Needs decision": "সিদ্ধান্ত প্রয়োজন",
  "Disruption open": "বিঘ্ন খোলা",

  // Modals
  "Transfer conversation": "কথোপকথন স্থানান্তর",
  "Resolve conversation": "কথোপকথন সমাধান",
  "Snooze conversation": "কথোপকথন স্নুজ",
  Destination: "গন্তব্য",
  Reason: "কারণ",
  "Wake condition": "জাগার শর্ত",
  "Wakes to": "জাগবে",
  "Wake in": "জাগবে",
  "Resolution category": "সমাধান বিভাগ",
  "Domain reference": "ডোমেইন রেফারেন্স",
  "Why do you need it?": "আপনার এটি কেন প্রয়োজন?",

  // Admin settings
  "Tenant configuration": "টেন্যান্ট কনফিগারেশন",
  "Review & publish": "পর্যালোচনা ও প্রকাশ",
  "Discard draft": "খসড়া বর্জন করুন",
  "Sandbox & tests": "স্যান্ডবক্স ও পরীক্ষা",
  "Changes & audit": "পরিবর্তন ও অডিট",
  "Save policy": "নীতি সংরক্ষণ করুন",
  "Save agent": "এজেন্ট সংরক্ষণ করুন",
  "Save calendar": "ক্যালেন্ডার সংরক্ষণ করুন",
  "Save retention policy": "রিটেনশন নীতি সংরক্ষণ করুন",
  "Submit for approval": "অনুমোদনের জন্য জমা দিন",
  "Channel configuration": "চ্যানেল কনফিগারেশন",
  "Role permissions": "ভূমিকা অনুমতি",
  "Retention policy": "রিটেনশন নীতি",
  "Knowledge source": "নলেজ উৎস",
  "Channel template": "চ্যানেল টেমপ্লেট",
  "Change requests": "পরিবর্তনের অনুরোধ",
  "Published versions": "প্রকাশিত ভার্সন",
  "Release controls": "রিলিজ নিয়ন্ত্রণ",
  "Roll back": "রোলব্যাক",
  "Administrative audit log": "প্রশাসনিক অডিট লগ",
  Assignments: "বরাদ্দ",
  "Break-glass access": "ব্রেক-গ্লাস অ্যাক্সেস",
  "Grant temporary access": "অস্থায়ী অ্যাক্সেস দিন",
  Revoke: "বাতিল করুন",

  // AI policy
  "High confidence": "উচ্চ আস্থা",
  Guarded: "সীমিত",
  "Clarify once": "একবার স্পষ্ট করুন",
  "Human handoff": "মানুষের কাছে হস্তান্তর",
  "Confidence thresholds": "আস্থার থ্রেশহোল্ড",
  "Knowledge corpus version": "নলেজ কর্পাস ভার্সন",
  "Global and tenant AI kill switch": "গ্লোবাল ও টেন্যান্ট এআই কিল সুইচ",
  "AI disabled": "এআই নিষ্ক্রিয়",
  "AI enabled": "এআই সক্রিয়",

  // Data tables
  Agent: "এজেন্ট",
  Teams: "টিম",
  Skills: "দক্ষতা",
  Languages: "ভাষা",
  "Base weight": "বেস ওজন",
  Concurrency: "সমকালীনতা",
  Access: "অ্যাক্সেস",
  Source: "উৎস",

  // Filters
  "Team / queue": "টিম / কিউ",
  "Date range": "তারিখ পরিসীমা",
  "All time": "সময়কাল",
  "24 hours": "২৪ ঘন্টা",
  "7 days": "৭ দিন",
  "30 days": "৩০ দিন",
  Clear: "পরিষ্কার",

  // Common actions
  Save: "সংরক্ষণ",
  Edit: "সম্পাদনা",
  Remove: "সরান",
  Reject: "প্রত্যাখ্যান",
  Approve: "অনুমোদন",
  Submit: "জমা দিন",
  Discard: "বর্জন",
  Request: "অনুরোধ",
  "View audit": "অডিট দেখুন",
  "View log": "লগ দেখুন",
  Configure: "কনফিগার করুন",
  "Inspect": "পরীক্ষা করুন",
  "Edit roles": "ভূমিকা সম্পাদনা",
  "Edit queue": "কিউ সম্পাদনা",
  "Edit calendar": "ক্যালেন্ডার সম্পাদনা",
  Logout: "লগআউট",
};

const DICTIONARIES: Record<UiLocale, Record<string, string>> = { en: {}, bn: BN };

type Ctx = {
  locale: UiLocale;
  setLocale: (l: UiLocale) => void;
  /** Translate, falling back to the English key when there is no Bangla. */
  t: (key: string) => string;
};

const UiLocaleContext = createContext<Ctx | null>(null);

/**
 * `localStorage` is an external store, so it is read through
 * `useSyncExternalStore` rather than copied into state by a mount effect —
 * that pattern sets state during an effect and triggers a cascading render.
 * The server snapshot is always English, which is also what the first client
 * render produces before the stored preference is applied, so hydration
 * matches.
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

function readLocale(): UiLocale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "bn" ? "bn" : "en";
  } catch {
    // Private mode or blocked storage — English is a fine default.
    return "en";
  }
}

function writeLocale(l: UiLocale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // Not being able to remember the choice is not worth failing over.
  }
  listeners.forEach((cb) => cb());
}

export function UiLocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => "en" as UiLocale);
  const setLocale = useCallback((l: UiLocale) => writeLocale(l), []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string) => DICTIONARIES[locale][key] ?? key;

  return (
    <UiLocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </UiLocaleContext.Provider>
  );
}

export function useUiLocale(): Ctx {
  const ctx = useContext(UiLocaleContext);
  // Deliberately forgiving: components outside the provider (the marketing
  // pages) render English rather than throwing.
  return ctx ?? { locale: "en", setLocale: () => {}, t: (k) => k };
}

/**
 * Wording for `slaBadge`'s structured result. Kept here rather than in the
 * engine so the engine stays language-free, and in one place rather than two
 * so `TicketList` and `DisruptionCohort` can never drift apart.
 */
export function formatSlaBadge(
  badge: { kind: "due" | "breached"; amount: number; unit: "m" | "h" },
  t: (k: string) => string,
): string {
  const unit = badge.unit === "h" ? t("h") : t("m");
  if (badge.kind === "breached") {
    return badge.amount <= 0
      ? t("SLA breached")
      : `${t("SLA breached")} ${badge.amount}${unit} ${t("ago")}`;
  }
  return `${t("SLA due in")} ${badge.amount}${unit}`;
}

export function LocaleToggle() {
  const { locale, setLocale } = useUiLocale();
  return (
    <div className="flex shrink-0 items-center rounded-full border border-panel p-0.5" role="group" aria-label="Interface language">
      {(["en", "bn"] as UiLocale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          lang={l}
          className={`rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
            locale === l ? "bg-panel text-ink" : "text-ink-dim hover:text-ink"
          }`}
        >
          {l === "en" ? "EN" : "বাংলা"}
        </button>
      ))}
    </div>
  );
}
