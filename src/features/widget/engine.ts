// Conversation engine for the customer-facing chat widget — TODO.md "P0".
// Pure state machine: no network calls, deterministic mock inventory. The
// reducer never performs a side effect itself; a delayed "bot is typing,
// then replies" turn is expressed as `pending`, which WidgetConversation.tsx
// resolves with a timer and re-dispatches the queued action.
//
// Every quick-reply option carries the exact WidgetAction it should
// dispatch, so the UI layer never has to re-derive "what does this id mean
// in this phase" — that ambiguity is exactly what made an earlier version
// of this file need untyped escape hatches.
//
// TODO (AI-01): Extend parser to detect and retain multiple intents per message.
//       Current: fixed-vocabulary parser resolves one intent at a time, falls
//       back to clarify chips. intentTrail is modelled but unused for multi-intent.
//       Future: parseIntents() returns array, first triggers direct answer,
//       others go to clarify. Update FAQ/clarify chip logic for multi-intent residue.

import { fmtBdt } from "@/shared/lib/format";

export type City = { code: string; name: string };

export const CITIES: City[] = [
  { code: "DAC", name: "Dhaka" },
  { code: "CXB", name: "Cox's Bazar" },
  { code: "ZYL", name: "Sylhet" },
  { code: "CGP", name: "Chittagong" },
];

const CITY_ALIASES: { code: string; words: string[] }[] = [
  { code: "DAC", words: ["dhaka", "dac", "ঢাকা"] },
  {
    code: "CXB",
    words: ["cox's bazar", "coxs bazar", "cox bazar", "coxsbazar", "cox's bazaar", "cxb", "কক্সবাজার"],
  },
  { code: "ZYL", words: ["sylhet", "zyl", "সিলেট"] },
  { code: "CGP", words: ["chittagong", "ctg", "cgp", "চট্টগ্রাম"] },
];

export type FareFamily = "Economy Saver" | "Economy Flexible" | "Business";

export type FareOffer = {
  id: string;
  origin: City;
  dest: City;
  depart: string;
  arrive: string;
  fareFamily: FareFamily;
  priceBdt: number;
};

/** Small deterministic string hash so any route pair gets stable, plausible fares. */
function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function generateOffers(origin: City, dest: City): FareOffer[] {
  // Real PRD worked example (§A3) for the Dhaka → Cox's Bazar morning search.
  if (origin.code === "DAC" && dest.code === "CXB") {
    return [
      { id: "F1", origin, dest, depart: "07:10", arrive: "08:20", fareFamily: "Economy Saver", priceBdt: 5800 },
      { id: "F2", origin, dest, depart: "09:45", arrive: "10:55", fareFamily: "Economy Saver", priceBdt: 6300 },
      { id: "F3", origin, dest, depart: "11:30", arrive: "12:40", fareFamily: "Economy Flexible", priceBdt: 8100 },
    ];
  }

  const seed = seedFrom(`${origin.code}-${dest.code}`);
  const startHour = 6 + (seed % 6);
  const families: FareFamily[] = ["Economy Saver", "Economy Saver", "Economy Flexible"];
  const basePrice = 4200 + (seed % 5) * 650;

  return families.map((fareFamily, i) => {
    const dh = (startHour + i * 3) % 24;
    const dm = (seed >> (i + 2)) % 4 === 0 ? 45 : (seed >> i) % 60 < 30 ? 0 : 30;
    const durationMin = 70 + (i % 2) * 15;
    const totalMin = dh * 60 + dm + durationMin;
    const ah = Math.floor(totalMin / 60) % 24;
    const am = totalMin % 60;
    return {
      id: `F${i + 1}`,
      origin,
      dest,
      depart: `${pad(dh)}:${pad(dm)}`,
      arrive: `${pad(ah)}:${pad(am)}`,
      fareFamily,
      priceBdt: basePrice + i * 900 + (fareFamily === "Economy Flexible" ? 1600 : 0),
    };
  });
}

export type PassengerType = "adult" | "child" | "infant";

export type Passenger = {
  name: string;
  dobISO: string;
  nid: string;
  type: PassengerType;
};

export function derivePassengerType(dobISO: string, travelDateISO: string): PassengerType {
  const dob = new Date(dobISO);
  const travel = new Date(travelDateISO);
  if (Number.isNaN(dob.getTime())) return "adult";
  let age = travel.getFullYear() - dob.getFullYear();
  const monthDiff = travel.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && travel.getDate() < dob.getDate())) age--;
  if (age < 2) return "infant";
  if (age < 12) return "child";
  return "adult";
}

export const FAQ = [
  {
    id: "baggage",
    keywords: ["baggage", "bag", "luggage", "koto kg", "allowance", "ব্যাগেজ", "লাগেজ", "কেজি"],
    q: "How much baggage can I take?",
    a: "Economy Saver includes 20kg checked baggage and 7kg cabin. Economy Flexible includes 30kg checked baggage and 7kg cabin, on domestic routes.",
    aBn: "ইকোনমি সেভার ভাড়ায় ২০ কেজি চেক-ইন এবং ৭ কেজি কেবিন ব্যাগেজ অন্তর্ভুক্ত। ইকোনমি ফ্লেক্সিবল ভাড়ায় দেশীয় রুটে ৩০ কেজি চেক-ইন এবং ৭ কেজি কেবিন ব্যাগেজ অন্তর্ভুক্ত।",
    source: "Fare Rules v3 · reviewed 12 Aug 2026",
  },
  {
    id: "refund",
    keywords: ["refund", "money back", "taka", "cancel", "রিফান্ড", "টাকা ফেরত", "বাতিল"],
    q: "How long do refunds take?",
    a: "Refunds to bKash and Nagad are usually visible within 3 business days of approval. Card refunds land on the original card within 5–10 business days depending on your bank.",
    aBn: "বিকাশ এবং নগদে রিফান্ড অনুমোদনের ৩ কার্যদিবসের মধ্যে দেখা যায়। কার্ডের রিফান্ড ব্যাংকভেদে ৫–১০ কার্যদিবসের মধ্যে মূল কার্ডে জমা হয়।",
    source: "Payments Policy v2 · reviewed 20 Aug 2026",
  },
  {
    id: "skystar",
    keywords: ["sky star", "skystar", "loyalty", "membership", "tier", "স্কাই স্টার", "সদস্যপদ", "লয়্যালটি"],
    q: "What are the Sky Star tiers?",
    a: "Sky Star has three tiers — Silver, Gold and Platinum — based on flights taken per year, each with priority boarding and extra baggage allowance.",
    aBn: "স্কাই স্টারে বছরে সম্পন্ন ফ্লাইটের সংখ্যার ভিত্তিতে তিনটি স্তর আছে — সিলভার, গোল্ড এবং প্ল্যাটিনাম — প্রতিটিতে অগ্রাধিকার বোর্ডিং এবং অতিরিক্ত ব্যাগেজ সুবিধা রয়েছে।",
    source: "Sky Star Programme Guide v4 · reviewed 3 Aug 2026",
  },
  {
    id: "change",
    keywords: ["change", "reschedule", "date change", "পরিবর্তন", "তারিখ পরিবর্তন"],
    q: "Can I change my travel date?",
    a: "Economy Flexible fares can be changed for a fixed fee up to 3 hours before departure. Economy Saver fares are not changeable. I can quote the exact fee, but a person will need to make the change for you.",
    aBn: "ইকোনমি ফ্লেক্সিবল ভাড়া প্রস্থানের ৩ ঘণ্টা আগ পর্যন্ত একটি নির্দিষ্ট ফি দিয়ে পরিবর্তন করা যায়। ইকোনমি সেভার ভাড়া পরিবর্তনযোগ্য নয়। আমি সঠিক ফি জানাতে পারি, তবে পরিবর্তনটি একজন প্রতিনিধিকে করে দিতে হবে।",
    source: "Fare Rules v3 · reviewed 12 Aug 2026",
  },
] as const;

export type QuickOption = { id: string; label: string; action: WidgetAction };

export type ChatMsg =
  | { id: string; kind: "bot-text"; text: string; ts: number }
  | { id: string; kind: "user-text"; text: string; ts: number }
  | { id: string; kind: "typing" }
  | { id: string; kind: "quick-replies"; options: QuickOption[] }
  | { id: string; kind: "fare-results"; offers: FareOffer[] }
  | { id: string; kind: "reprice"; original: FareOffer; updated: FareOffer; changed: boolean }
  | { id: string; kind: "passenger-summary"; passengers: Passenger[]; totalBdt: number }
  | { id: string; kind: "hold"; pnr: string; totalBdt: number; expiresAt: number }
  | { id: string; kind: "hold-expired" }
  | { id: string; kind: "payment-voided"; pnr: string; totalBdt: number }
  | { id: string; kind: "payment-panel"; totalBdt: number; pnr: string }
  | { id: string; kind: "ticket"; pnr: string; origin: City; dest: City; passengers: Passenger[]; totalBdt: number }
  | { id: string; kind: "faq-answer"; question: string; answer: string; source: string }
  | { id: string; kind: "handoff"; queuePosition: number }
  | { id: string; kind: "system"; text: string };

type PassengerField = "name" | "dob" | "nid";
type MenuId = "search" | "track" | "faq" | "agent" | "menu";

export type Phase =
  | "menu"
  | "collect-origin"
  | "collect-dest"
  | "collect-date"
  | "collect-pax"
  | "searching"
  | "results"
  | "repricing"
  | "collect-passenger"
  | "confirm-passengers"
  | "hold"
  | "payment"
  | "ticketed"
  | "manage-pnr"
  | "faq"
  | "handed-off";

export type Locale = "en" | "bn" | "banglish";

export type WidgetState = {
  messages: ChatMsg[];
  phase: Phase;
  search: { origin?: City; dest?: City; dateISO?: string; dateLabel?: string; pax?: number };
  offers: FareOffer[];
  selectedOffer?: FareOffer;
  passengers: Passenger[];
  passengerDraft: Partial<Passenger>;
  passengerIndex: number;
  passengerField: PassengerField;
  pnr?: string;
  totalBdt?: number;
  /** Detected from the customer's own typing — see `detectLocale` below. */
  locale: Locale;
  /**
   * True from the moment SIMULATE_PAYMENT dispatches until RESOLVE_TICKETING
   * lands. Lets a hold-expiry that races in during that window (the hold's
   * own countdown keeps ticking in the background even once the payment
   * panel is showing — see `HoldCountdown` in bubbles.tsx) suppress the
   * plain "hold expired" card and defer to the one authoritative outcome
   * RESOLVE_TICKETING produces, instead of showing both.
   */
  paymentInFlight: boolean;
  pending?: { delayMs: number; action: WidgetAction };
};

export type WidgetAction =
  | { type: "QUICK_ACTION"; id: MenuId }
  | { type: "USER_TEXT"; text: string }
  | { type: "PICK_CITY"; slot: "origin" | "dest"; city: City }
  | { type: "PICK_DATE"; iso: string; label: string }
  | { type: "PICK_PAX"; n: number | "group" }
  | { type: "RESOLVE_SEARCH" }
  | { type: "SELECT_OFFER"; offerId: string }
  | { type: "RESOLVE_REPRICE" }
  | { type: "ACCEPT_REPRICE" }
  | { type: "DECLINE_REPRICE" }
  | { type: "SUBMIT_PASSENGER_FIELD"; value: string }
  | { type: "CONFIRM_PASSENGERS" }
  | { type: "RESOLVE_HOLD" }
  | { type: "START_PAYMENT" }
  | { type: "SIMULATE_PAYMENT" }
  | { type: "RESOLVE_TICKETING" }
  | { type: "HOLD_EXPIRED" }
  | { type: "REBOOK_SAME_FARE" }
  | { type: "ASK_FAQ"; topicId: string }
  | { type: "RESOLVE_FAQ"; topicId: string }
  | { type: "LOOKUP_PNR"; pnr: string }
  | { type: "RESOLVE_PNR_LOOKUP"; pnr: string }
  | { type: "RESEND_TICKET" }
  | { type: "RESOLVE_HANDOFF" };

let uid = 0;
function id(): string {
  uid += 1;
  return `m${uid}`;
}

function bot(text: string): ChatMsg {
  return { id: id(), kind: "bot-text", text, ts: Date.now() };
}
function user(text: string): ChatMsg {
  return { id: id(), kind: "user-text", text, ts: Date.now() };
}
function typing(): ChatMsg {
  return { id: id(), kind: "typing" };
}
function quick(options: QuickOption[]): ChatMsg {
  return { id: id(), kind: "quick-replies", options };
}
function dropTyping(messages: ChatMsg[]): ChatMsg[] {
  return messages.filter((m) => m.kind !== "typing");
}
function withTyping(state: WidgetState, append: ChatMsg[], delayMs: number, next: WidgetAction): WidgetState {
  return { ...state, messages: [...state.messages, ...append, typing()], pending: { delayMs, action: next } };
}

const MENU_OPTIONS: QuickOption[] = [
  { id: "search", label: "Search a flight", action: { type: "QUICK_ACTION", id: "search" } },
  { id: "track", label: "Track my booking", action: { type: "QUICK_ACTION", id: "track" } },
  { id: "faq", label: "Ask a question", action: { type: "QUICK_ACTION", id: "faq" } },
  { id: "agent", label: "Talk to a person", action: { type: "QUICK_ACTION", id: "agent" } },
];
const BACK_TO_MENU: QuickOption = { id: "menu", label: "Back to menu", action: { type: "QUICK_ACTION", id: "menu" } };

export function initialState(): WidgetState {
  return {
    messages: [
      bot(
        "Hi, I'm the Nexchatgen assistant. I can search flights, take a booking, check a PNR, or connect you with a person — in Bangla, English or Banglish."
      ),
      quick(MENU_OPTIONS),
    ],
    phase: "menu",
    search: {},
    offers: [],
    passengers: [],
    passengerDraft: {},
    passengerIndex: 0,
    passengerField: "name",
    locale: "en",
    paymentInFlight: false,
  };
}

const BANGLISH_WORDS = ["theke", "kal", "aj", "koto", "taka", "ache", "vai", "bhai", "chai", "korte", "jabo", "ta"];

/**
 * Locale is pinned from the customer's own typing, per PRD §B3 — this drives
 * the header's language indicator. It does not translate the assistant's
 * own replies: doing that correctly needs a reviewed translation (§E4
 * "one canonical language with a reviewed translation"), which a frontend
 * pass can't responsibly fabricate — see TODO.md.
 */
export function detectLocale(text: string): Locale {
  if (/[ঀ-৿]/.test(text)) return "bn";
  const t = text.toLowerCase();
  if (BANGLISH_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(t))) return "banglish";
  return "en";
}

/**
 * Locale-aware bot reply text — §B3/§E4's actual "reply in Bangla" behavior,
 * not just detecting it. Banglish gets the same Bangla-script reply as `bn`
 * rather than a third, romanized translation: the PRD's own "one canonical
 * language with a reviewed translation" (§E4) implies one alternate, not a
 * transliterated one. These Bangla strings are AI-drafted for this demo and
 * have not had a native-speaker review pass — see TODO.md "P0" for why that
 * caveat still applies even though the wiring itself is real.
 */
function tx(locale: Locale, en: string, bn: string): string {
  return locale === "en" ? en : bn;
}

function passengerPrompt(locale: Locale, n: number, total: number): string {
  return tx(
    locale,
    `Passenger ${n} of ${total}: name as it appears on the NID or passport.`,
    `যাত্রী ${n}/${total}: এনআইডি বা পাসপোর্টে যেভাবে নাম লেখা আছে, সেভাবে লিখুন।`
  );
}

// --- Parsing helpers ---------------------------------------------------

function findCity(text: string): City | undefined {
  const t = text.toLowerCase();
  const hit = CITY_ALIASES.find((c) => c.words.some((w) => t.includes(w)));
  return hit ? CITIES.find((c) => c.code === hit.code) : undefined;
}

function findTwoCities(text: string): { origin?: City; dest?: City } {
  const t = text.toLowerCase();
  const found: { code: string; index: number }[] = [];
  for (const c of CITY_ALIASES) {
    for (const w of c.words) {
      const idx = t.indexOf(w);
      if (idx >= 0) {
        found.push({ code: c.code, index: idx });
        break;
      }
    }
  }
  found.sort((a, b) => a.index - b.index);
  const uniq = found.filter((f, i) => found.findIndex((x) => x.code === f.code) === i);
  const origin = uniq[0] ? CITIES.find((c) => c.code === uniq[0].code) : undefined;
  const dest = uniq[1] ? CITIES.find((c) => c.code === uniq[1].code) : undefined;
  return { origin, dest };
}

function bnDigitsToArabic(text: string): string {
  const map: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
  return text.replace(/[০-৯]/g, (d) => map[d] ?? d);
}

function findDate(text: string): { iso: string; label: string } | undefined {
  const t = text.toLowerCase();
  const now = new Date();
  const fmt = (d: Date) => ({ iso: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) });
  if (/\bkal\b|\btomorrow\b|আগামীকাল|কাল/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }
  if (/\baj\b|\btoday\b|আজ/.test(t)) return fmt(now);
  return undefined;
}

function findPax(text: string): number | undefined {
  const t = bnDigitsToArabic(text.toLowerCase());
  const m = t.match(/(\d+)\s*(jon|jan|passenger|passengers|pax|people)/);
  if (m) return Math.min(9, Math.max(1, parseInt(m[1], 10)));
  const bare = t.match(/^\s*(\d+)\s*$/);
  if (bare) return Math.min(9, Math.max(1, parseInt(bare[1], 10)));
  return undefined;
}

function totalFor(offer: FareOffer, pax: number): number {
  return offer.priceBdt * pax;
}
function fareLine(o: FareOffer): string {
  return `${o.depart} → ${o.arrive} · ${o.fareFamily} · ${fmtBdt(o.priceBdt)}/person`;
}
function makePnr(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// Demo hold TTL: the PRD's own countdown is 12 minutes; sitting through a
// real 12-minute wait is the wrong UX inside a live demo, so this is
// shortened to 75s and labelled as a demo value everywhere it's shown.
export const DEMO_HOLD_SECONDS = 75;

// --- Slot-filling prompts ------------------------------------------------

function askOrigin(state: WidgetState): WidgetState {
  return {
    ...state,
    phase: "collect-origin",
    messages: [
      ...state.messages,
      bot(tx(state.locale, "Where are you flying from?", "আপনি কোথা থেকে যাত্রা শুরু করবেন?")),
      quick(CITIES.map((c) => ({ id: c.code, label: c.name, action: { type: "PICK_CITY", slot: "origin", city: c } }))),
    ],
  };
}

function askDest(state: WidgetState): WidgetState {
  const opts = CITIES.filter((c) => c.code !== state.search.origin?.code);
  return {
    ...state,
    phase: "collect-dest",
    messages: [
      ...state.messages,
      bot(tx(state.locale, "And where to?", "এবং কোথায় যাবেন?")),
      quick(opts.map((c) => ({ id: c.code, label: c.name, action: { type: "PICK_CITY", slot: "dest", city: c } }))),
    ],
  };
}

function askDate(state: WidgetState): WidgetState {
  const now = new Date();
  const tmr = new Date(now);
  tmr.setDate(tmr.getDate() + 1);
  const label = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const opt = (d: Date, name: string): QuickOption => {
    const iso = d.toISOString().slice(0, 10);
    const l = `${name} · ${label(d)}`;
    return { id: iso, label: l, action: { type: "PICK_DATE", iso, label: l } };
  };
  return {
    ...state,
    phase: "collect-date",
    messages: [...state.messages, bot(tx(state.locale, "Which date?", "কোন তারিখে যাবেন?")), quick([opt(now, "Today"), opt(tmr, "Tomorrow")])],
  };
}

function askPax(state: WidgetState): WidgetState {
  return {
    ...state,
    phase: "collect-pax",
    messages: [
      ...state.messages,
      bot(tx(state.locale, "How many passengers?", "কতজন যাত্রী হবেন?")),
      quick([
        { id: "1", label: "1", action: { type: "PICK_PAX", n: 1 } },
        { id: "2", label: "2", action: { type: "PICK_PAX", n: 2 } },
        { id: "3", label: "3", action: { type: "PICK_PAX", n: 3 } },
        { id: "group", label: "4 or more", action: { type: "PICK_PAX", n: "group" } },
      ]),
    ],
  };
}

function beginSearchFlow(state: WidgetState, seedText?: string): WidgetState {
  let s: WidgetState = { ...state, search: {} };
  if (seedText) {
    const { origin, dest } = findTwoCities(seedText);
    const date = findDate(seedText);
    const pax = findPax(seedText);
    s = { ...s, search: { origin, dest, dateISO: date?.iso, dateLabel: date?.label, pax } };
  }
  if (!s.search.origin) return askOrigin(s);
  if (!s.search.dest) return askDest(s);
  if (!s.search.dateISO) return askDate(s);
  if (!s.search.pax) return askPax(s);
  return runSearch(s);
}

function runSearch(state: WidgetState): WidgetState {
  if (!state.search.origin || !state.search.dest) return state;
  return withTyping({ ...state, phase: "searching" }, [], 900, { type: "RESOLVE_SEARCH" });
}

function groupHandoff(state: WidgetState): WidgetState {
  return withTyping(
    state,
    [
      bot(
        tx(
          state.locale,
          "For four or more passengers I'll get a specialist to build the group booking with you.",
          "চার বা তার বেশি যাত্রীর জন্য আমি একজন বিশেষজ্ঞের সাথে সংযোগ করিয়ে দিচ্ছি, যিনি আপনার গ্রুপ বুকিং করে দেবেন।"
        )
      ),
    ],
    800,
    { type: "RESOLVE_HANDOFF" }
  );
}

// --- Reducer handlers ------------------------------------------------------

function reduceQuickAction(state: WidgetState, menuId: MenuId): WidgetState {
  const label = MENU_OPTIONS.find((o) => o.id === menuId)?.label ?? menuId;
  const withUser: WidgetState = { ...state, messages: [...state.messages, user(label)] };

  if (menuId === "search") return beginSearchFlow(withUser);
  if (menuId === "menu")
    return {
      ...withUser,
      phase: "menu",
      messages: [...withUser.messages, bot(tx(state.locale, "Sure — what would you like to do?", "ঠিক আছে — আপনি কী করতে চান?")), quick(MENU_OPTIONS)],
    };
  if (menuId === "track") {
    return {
      ...withUser,
      phase: "manage-pnr",
      messages: [
        ...withUser.messages,
        bot(tx(state.locale, "What's your PNR? (Try XKD4RP for a live example.)", "আপনার পিএনআর নম্বরটি বলুন। (উদাহরণ হিসেবে XKD4RP লিখে দেখতে পারেন।)")),
        quick([BACK_TO_MENU]),
      ],
    };
  }
  if (menuId === "faq") {
    return {
      ...withUser,
      phase: "faq",
      messages: [
        ...withUser.messages,
        bot(tx(state.locale, "What would you like to know?", "আপনি কী জানতে চান?")),
        quick(FAQ.map((f) => ({ id: f.id, label: f.q, action: { type: "ASK_FAQ", topicId: f.id } }))),
      ],
    };
  }
  // agent
  return withTyping(withUser, [], 700, { type: "RESOLVE_HANDOFF" });
}

function reduceUserText(state: WidgetState, text: string): WidgetState {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const withUser: WidgetState = { ...state, locale: detectLocale(trimmed), messages: [...state.messages, user(trimmed)] };
  const loc = withUser.locale;
  const lower = trimmed.toLowerCase();

  if (/\bhuman\b|\bagent\b|\btalk to a person\b|কথা বলতে চাই/.test(lower)) {
    return withTyping(withUser, [], 700, { type: "RESOLVE_HANDOFF" });
  }

  switch (state.phase) {
    case "menu": {
      const { origin, dest } = findTwoCities(trimmed);
      if (origin || dest || findDate(trimmed) || /flight|fly|book|search/.test(lower)) return beginSearchFlow(withUser, trimmed);
      const faqHit = FAQ.find((f) => f.keywords.some((k) => lower.includes(k)));
      if (faqHit) return askFaq(withUser, faqHit.id);
      if (/pnr|track/.test(lower))
        return { ...withUser, phase: "manage-pnr", messages: [...withUser.messages, bot(tx(loc, "What's your PNR? (Try XKD4RP.)", "আপনার পিএনআর নম্বরটি বলুন। (XKD4RP লিখে দেখতে পারেন।)"))] };
      return {
        ...withUser,
        messages: [
          ...withUser.messages,
          bot(
            tx(
              loc,
              "I can search a flight, track a booking, answer a fare question, or connect you with a person — which would help?",
              "আমি ফ্লাইট খুঁজে দিতে পারি, বুকিং ট্র্যাক করতে পারি, ভাড়া সংক্রান্ত প্রশ্নের উত্তর দিতে পারি, অথবা আপনাকে একজন প্রতিনিধির সাথে সংযুক্ত করতে পারি — কোনটি প্রয়োজন?"
            )
          ),
          quick(MENU_OPTIONS),
        ],
      };
    }
    case "collect-origin": {
      const c = findCity(trimmed);
      if (!c)
        return {
          ...withUser,
          messages: [
            ...withUser.messages,
            bot(
              tx(
                loc,
                "Sorry, I only fly Dhaka, Cox's Bazar, Sylhet and Chittagong right now — which one?",
                "দুঃখিত, এই মুহূর্তে শুধু ঢাকা, কক্সবাজার, সিলেট এবং চট্টগ্রামের ফ্লাইট আছে — কোনটি বলুন?"
              )
            ),
          ],
        };
      return askDest({ ...withUser, search: { ...withUser.search, origin: c } });
    }
    case "collect-dest": {
      const c = findCity(trimmed);
      if (!c || c.code === state.search.origin?.code)
        return { ...withUser, messages: [...withUser.messages, bot(tx(loc, "Pick a different city to fly to — which one?", "যাত্রার শহরের চেয়ে ভিন্ন একটি গন্তব্য শহর বলুন।"))] };
      return askDate({ ...withUser, search: { ...withUser.search, dest: c } });
    }
    case "collect-date": {
      const d = findDate(trimmed);
      if (!d)
        return {
          ...withUser,
          messages: [...withUser.messages, bot(tx(loc, "Try “today” or “tomorrow” — or tap a date below.", "“আজ” অথবা “কাল” লিখুন — অথবা নিচে থেকে একটি তারিখ বেছে নিন।"))],
        };
      return askPax({ ...withUser, search: { ...withUser.search, dateISO: d.iso, dateLabel: d.label } });
    }
    case "collect-pax": {
      const n = findPax(trimmed);
      if (!n)
        return { ...withUser, messages: [...withUser.messages, bot(tx(loc, "How many passengers — a number between 1 and 9?", "কতজন যাত্রী — ১ থেকে ৯ এর মধ্যে একটি সংখ্যা বলুন।"))] };
      if (n >= 4) return groupHandoff(withUser);
      return runSearch({ ...withUser, search: { ...withUser.search, pax: n } });
    }
    case "collect-passenger":
      return reduceSubmitPassengerField(withUser, trimmed);
    case "manage-pnr":
      return withTyping(withUser, [], 700, { type: "RESOLVE_PNR_LOOKUP", pnr: trimmed });
    case "faq": {
      const faqHit = FAQ.find((f) => f.keywords.some((k) => lower.includes(k)));
      if (faqHit) return askFaq(withUser, faqHit.id);
      return withTyping(
        withUser,
        [bot(tx(loc, "I don't have an approved answer for that yet — let me connect you with a person.", "এই বিষয়ে আমার কাছে এখনো অনুমোদিত উত্তর নেই — আমি আপনাকে একজন প্রতিনিধির সাথে সংযুক্ত করে দিচ্ছি।"))],
        700,
        { type: "RESOLVE_HANDOFF" }
      );
    }
    default:
      return {
        ...withUser,
        phase: "menu",
        messages: [...withUser.messages, bot(tx(loc, "Got it. Anything else I can help with?", "বুঝেছি। আর কোনো বিষয়ে সাহায্য করতে পারি?")), quick(MENU_OPTIONS)],
      };
  }
}

function reduceSelectOffer(state: WidgetState, offerId: string): WidgetState {
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer) return state;
  return withTyping({ ...state, selectedOffer: offer, messages: [...state.messages, user(fareLine(offer))] }, [], 700, { type: "RESOLVE_REPRICE" });
}

function reduceResolveReprice(state: WidgetState): WidgetState {
  const offer = state.selectedOffer;
  if (!offer) return state;
  // The Economy Flexible fare is the one deliberately shown re-pricing up,
  // so PRD §B2's "re-price before the hold, and require re-confirmation if
  // it moved" branch is reachable on demand rather than left as dead code.
  const changed = offer.fareFamily === "Economy Flexible";
  const updated: FareOffer = changed ? { ...offer, priceBdt: offer.priceBdt + 350 } : offer;
  return { ...state, phase: "repricing", messages: [...dropTyping(state.messages), { id: id(), kind: "reprice", original: offer, updated, changed }] };
}

function reduceAcceptReprice(state: WidgetState): WidgetState {
  const offer = state.selectedOffer;
  if (!offer) return state;
  const changed = offer.fareFamily === "Economy Flexible";
  const finalOffer: FareOffer = changed ? { ...offer, priceBdt: offer.priceBdt + 350 } : offer;
  const withUser: WidgetState = { ...state, selectedOffer: finalOffer, messages: [...state.messages, user("Confirm")] };

  const pax = state.search.pax ?? 1;
  if (state.passengers.length === pax) {
    // Rebook-after-expiry: passengers are already known, skip straight to a fresh hold.
    const totalBdt = totalFor(finalOffer, pax);
    return withTyping({ ...withUser, totalBdt }, [], 800, { type: "RESOLVE_HOLD" });
  }

  return {
    ...withUser,
    phase: "collect-passenger",
    passengers: [],
    passengerIndex: 0,
    passengerField: "name",
    passengerDraft: {},
    messages: [...withUser.messages, bot(passengerPrompt(withUser.locale, 1, pax))],
  };
}

function reduceDeclineReprice(state: WidgetState): WidgetState {
  return {
    ...state,
    phase: "results",
    selectedOffer: undefined,
    messages: [...state.messages, user("Show me other options"), { id: id(), kind: "fare-results", offers: state.offers }],
  };
}

function reduceSubmitPassengerField(state: WidgetState, value: string): WidgetState {
  const draft = { ...state.passengerDraft };
  const trimmed = value.trim();

  if (state.passengerField === "name") {
    if (trimmed.length < 2) {
      return {
        ...state,
        messages: [...state.messages, bot(tx(state.locale, "Name must be at least 2 characters.", "নাম কমপক্ষে ২ অক্ষর হতে হবে।"))],
      };
    }
    if (trimmed.length > 100) {
      return {
        ...state,
        messages: [...state.messages, bot(tx(state.locale, "Name must be 100 characters or fewer.", "নাম ১০০ অক্ষরের বেশি হতে পারবে না।"))],
      };
    }
    draft.name = trimmed;
    return {
      ...state,
      passengerDraft: draft,
      passengerField: "dob",
      messages: [...state.messages, bot(tx(state.locale, "Date of birth? (YYYY-MM-DD)", "জন্ম তারিখ কী? (YYYY-MM-DD ফরম্যাটে)"))],
    };
  }

  if (state.passengerField === "dob") {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(trimmed)) {
      return {
        ...state,
        messages: [...state.messages, bot(tx(state.locale, "Please enter date in YYYY-MM-DD format.", "অনুগ্রহ করে YYYY-MM-DD ফরম্যাটে তারিখ দিন।"))],
      };
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime()) || parsed > new Date()) {
      return {
        ...state,
        messages: [...state.messages, bot(tx(state.locale, "Please enter a valid past date.", "অনুগ্রহ করে একটি বৈধ অতীত তারিখ দিন।"))],
      };
    }
    draft.dobISO = trimmed;
    return {
      ...state,
      passengerDraft: draft,
      passengerField: "nid",
      messages: [...state.messages, bot(tx(state.locale, "NID or passport number?", "এনআইডি বা পাসপোর্ট নম্বর কত?"))],
    };
  }

  if (state.passengerField === "nid") {
    const nidRe = /^\d{10,17}$/;
    const passportRe = /^[A-Z0-9]{5,15}$/i;
    if (!nidRe.test(trimmed) && !passportRe.test(trimmed)) {
      return {
        ...state,
        messages: [...state.messages, bot(tx(state.locale, "Enter a valid NID (10-17 digits) or passport (5-15 alphanumeric).", "একটি বৈধ এনআইডি (১০-১৭ সংখ্যা) বা পাসপোর্ট (৫-১৫ অক্ষর/সংখ্যা) দিন।"))],
      };
    }
    draft.nid = trimmed;
  }

  const travelDate = state.search.dateISO ?? new Date().toISOString().slice(0, 10);
  const type = draft.dobISO ? derivePassengerType(draft.dobISO, travelDate) : "adult";
  const completed: Passenger = { name: draft.name ?? "Passenger", dobISO: draft.dobISO ?? travelDate, nid: draft.nid ?? "", type };
  const passengers = [...state.passengers, completed];
  const nextIndex = state.passengerIndex + 1;
  const total = state.search.pax ?? passengers.length;

  if (nextIndex < total) {
    return {
      ...state,
      passengers,
      passengerIndex: nextIndex,
      passengerField: "name",
      passengerDraft: {},
      messages: [...state.messages, bot(passengerPrompt(state.locale, nextIndex + 1, total))],
    };
  }

  const totalBdt = state.selectedOffer ? totalFor(state.selectedOffer, total) : 0;
  return { ...state, passengers, phase: "confirm-passengers", totalBdt, messages: [...state.messages, { id: id(), kind: "passenger-summary", passengers, totalBdt }] };
}

function reduceHoldCreated(state: WidgetState): WidgetState {
  const pnr = makePnr();
  const expiresAt = Date.now() + DEMO_HOLD_SECONDS * 1000;
  return {
    ...state,
    phase: "hold",
    pnr,
    messages: [...dropTyping(state.messages), { id: id(), kind: "hold", pnr, totalBdt: state.totalBdt ?? 0, expiresAt }],
  };
}

function reduceStartPayment(state: WidgetState): WidgetState {
  return {
    ...state,
    phase: "payment",
    messages: [...state.messages, user("Pay now"), { id: id(), kind: "payment-panel", totalBdt: state.totalBdt ?? 0, pnr: state.pnr ?? "" }],
  };
}

function reduceSimulatePayment(state: WidgetState): WidgetState {
  return withTyping(
    { ...state, paymentInFlight: true, messages: [...state.messages, user("Payment sent")] },
    [bot(tx(state.locale, "Payment successful. Confirming your seats…", "পেমেন্ট সফল হয়েছে। আপনার সিট নিশ্চিত করা হচ্ছে…"))],
    1100,
    { type: "RESOLVE_TICKETING" }
  );
}

function reduceResolveTicketing(state: WidgetState): WidgetState {
  const { origin, dest } = state.search;
  if (!origin || !dest || !state.pnr) return state;

  if (state.phase !== "payment") {
    // The hold's own countdown crossed zero while this payment was still in
    // flight — §B2's "money held without inventory" branch. The seats are
    // already gone by the time confirmation lands, so no ticket is issued;
    // the charge is voided/refunded instead of silently succeeding.
    return {
      ...state,
      phase: "results",
      paymentInFlight: false,
      messages: [...dropTyping(state.messages), { id: id(), kind: "payment-voided", pnr: state.pnr, totalBdt: state.totalBdt ?? 0 }],
    };
  }

  return {
    ...state,
    phase: "ticketed",
    paymentInFlight: false,
    messages: [
      ...dropTyping(state.messages),
      { id: id(), kind: "ticket", pnr: state.pnr, origin, dest, passengers: state.passengers, totalBdt: state.totalBdt ?? 0 },
      bot(tx(state.locale, "Anything else I can help with?", "আর কোনো বিষয়ে সাহায্য করতে পারি?")),
      quick(MENU_OPTIONS),
    ],
  };
}

function reduceHoldExpired(state: WidgetState): WidgetState {
  if (state.phase !== "hold" && state.phase !== "payment") return state;
  if (state.paymentInFlight) {
    // Don't also announce a plain expiry here — RESOLVE_TICKETING is about
    // to land the one authoritative outcome for this payment attempt.
    return { ...state, phase: "results" };
  }
  return { ...state, phase: "results", messages: [...state.messages, { id: id(), kind: "hold-expired" }] };
}

function reduceRebookSameFare(state: WidgetState): WidgetState {
  if (!state.selectedOffer) return state;
  return withTyping({ ...state, messages: [...state.messages, user("Rebook the same fare")] }, [], 700, { type: "RESOLVE_REPRICE" });
}

function askFaq(state: WidgetState, topicId: string): WidgetState {
  const topic = FAQ.find((f) => f.id === topicId);
  return withTyping({ ...state, messages: [...state.messages, user(topic?.q ?? "that")] }, [], 800, { type: "RESOLVE_FAQ", topicId });
}

function reduceResolveFaq(state: WidgetState, topicId: string): WidgetState {
  const topic = FAQ.find((f) => f.id === topicId);
  if (!topic) return state;
  return {
    ...state,
    phase: "faq",
    messages: [
      ...dropTyping(state.messages),
      { id: id(), kind: "faq-answer", question: topic.q, answer: tx(state.locale, topic.a, topic.aBn), source: topic.source },
      quick([...FAQ.map((f) => ({ id: f.id, label: f.q, action: { type: "ASK_FAQ", topicId: f.id } as WidgetAction })), BACK_TO_MENU]),
    ],
  };
}

const DEMO_PNR_RECORD = { pnr: "XKD4RP", route: "DAC → CXB", status: "On time · departs 07:10", baggage: "20kg checked, 7kg cabin (Economy Saver)" };

function reduceResolvePnrLookup(state: WidgetState, rawPnr: string): WidgetState {
  const pnr = rawPnr.trim().toUpperCase();
  const known = pnr === DEMO_PNR_RECORD.pnr || pnr === state.pnr;
  if (!known) {
    return {
      ...state,
      messages: [
        ...dropTyping(state.messages),
        bot(
          tx(
            state.locale,
            "I can't find that PNR — double-check it, or I can connect you with a person.",
            "এই পিএনআর নম্বরটি খুঁজে পাওয়া যায়নি — আবার যাচাই করুন, অথবা আমি আপনাকে একজন প্রতিনিধির সাথে সংযুক্ত করে দিতে পারি।"
          )
        ),
        quick([BACK_TO_MENU]),
      ],
    };
  }
  const record = pnr === state.pnr && state.search.origin && state.search.dest
    ? { route: `${state.search.origin.code} → ${state.search.dest.code}`, status: DEMO_PNR_RECORD.status, baggage: DEMO_PNR_RECORD.baggage }
    : DEMO_PNR_RECORD;
  return {
    ...state,
    phase: "manage-pnr",
    messages: [
      ...dropTyping(state.messages),
      bot(
        tx(
          state.locale,
          `PNR ${pnr}: ${record.route} — ${record.status}. Baggage: ${record.baggage}.`,
          `পিএনআর ${pnr}: ${record.route} — ${record.status}। ব্যাগেজ: ${record.baggage}।`
        )
      ),
      quick([{ id: "resend", label: "Resend my ticket", action: { type: "RESEND_TICKET" } }, BACK_TO_MENU]),
    ],
  };
}

// --- Reducer ---------------------------------------------------------------

export function widgetReducer(state: WidgetState, action: WidgetAction): WidgetState {
  const s = state.pending ? { ...state, pending: undefined } : state;

  switch (action.type) {
    case "QUICK_ACTION":
      return reduceQuickAction(s, action.id);
    case "USER_TEXT":
      return reduceUserText(s, action.text);
    case "PICK_CITY": {
      const withUser: WidgetState = { ...s, messages: [...s.messages, user(action.city.name)] };
      return action.slot === "origin"
        ? askDest({ ...withUser, search: { ...withUser.search, origin: action.city } })
        : askDate({ ...withUser, search: { ...withUser.search, dest: action.city } });
    }
    case "PICK_DATE": {
      const withUser: WidgetState = { ...s, messages: [...s.messages, user(action.label)] };
      return askPax({ ...withUser, search: { ...withUser.search, dateISO: action.iso, dateLabel: action.label } });
    }
    case "PICK_PAX": {
      const label = action.n === "group" ? "4 or more" : String(action.n);
      const withUser: WidgetState = { ...s, messages: [...s.messages, user(label)] };
      return action.n === "group" ? groupHandoff(withUser) : runSearch({ ...withUser, search: { ...withUser.search, pax: action.n } });
    }
    case "RESOLVE_SEARCH": {
      const { origin, dest } = s.search;
      if (!origin || !dest) return s;
      const offers = generateOffers(origin, dest);
      return { ...s, phase: "results", offers, messages: [...dropTyping(s.messages), { id: id(), kind: "fare-results", offers }] };
    }
    case "SELECT_OFFER":
      return reduceSelectOffer(s, action.offerId);
    case "RESOLVE_REPRICE":
      return reduceResolveReprice(s);
    case "ACCEPT_REPRICE":
      return reduceAcceptReprice(s);
    case "DECLINE_REPRICE":
      return reduceDeclineReprice(s);
    case "SUBMIT_PASSENGER_FIELD":
      return reduceSubmitPassengerField(s, action.value);
    case "CONFIRM_PASSENGERS":
      return withTyping({ ...s, messages: [...s.messages, user("Confirm passenger details")] }, [], 900, { type: "RESOLVE_HOLD" });
    case "RESOLVE_HOLD":
      return reduceHoldCreated(s);
    case "START_PAYMENT":
      return reduceStartPayment(s);
    case "SIMULATE_PAYMENT":
      return reduceSimulatePayment(s);
    case "RESOLVE_TICKETING":
      return reduceResolveTicketing(s);
    case "HOLD_EXPIRED":
      return reduceHoldExpired(s);
    case "REBOOK_SAME_FARE":
      return reduceRebookSameFare(s);
    case "ASK_FAQ":
      return askFaq(s, action.topicId);
    case "RESOLVE_FAQ":
      return reduceResolveFaq(s, action.topicId);
    case "LOOKUP_PNR": {
      const withUser: WidgetState = { ...s, messages: [...s.messages, user(action.pnr)] };
      return withTyping(withUser, [], 700, { type: "RESOLVE_PNR_LOOKUP", pnr: action.pnr });
    }
    case "RESOLVE_PNR_LOOKUP":
      return reduceResolvePnrLookup(s, action.pnr);
    case "RESEND_TICKET":
      return {
        ...s,
        messages: [...s.messages, user("Resend my ticket"), bot(tx(s.locale, "Sent — check your WhatsApp and email.", "পাঠানো হয়েছে — আপনার হোয়াটসঅ্যাপ এবং ইমেইল চেক করুন।")), quick(MENU_OPTIONS)],
      };
    case "RESOLVE_HANDOFF":
      return { ...s, phase: "handed-off", messages: [...dropTyping(s.messages), { id: id(), kind: "handoff", queuePosition: 1 }] };
    default:
      return s;
  }
}
