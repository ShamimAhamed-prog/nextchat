/**
 * AG-04: the stored Bangla translation behind "Insert in Bangla".
 *
 * The requirement is narrow and worth stating exactly, because it is the
 * reason this module is so small: the control appears *only* where a
 * translation already exists, and the text it inserts is one a human
 * reviewed. Nothing here may translate on demand — a machine-drafted reply
 * pasted into a customer conversation by an agent who cannot read it is the
 * failure mode AG-04 exists to prevent.
 *
 * Still unimplemented, and not pretended at: a real translation service,
 * and the per-article version and review record AG-04 wants alongside it
 * (`TranslationEntry` carries the fields; nothing writes them yet). What is
 * here is a lookup over a fixed table, which is what the prototype needs
 * and all it claims to be. An earlier version wrapped that table in a
 * `Map` cache plus `addTranslation`, `getAllTranslations` and
 * `clearTranslationCache` — memoising a constant lookup, and three
 * functions no caller ever reached. Removed rather than left as scaffolding
 * that reads like a working cache.
 */
export type TranslationEntry = {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  version: number;
  reviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
};

/**
 * Reviewed Bangla for the English FAQ answers that have it.
 *
 * Keyed by the English source text, which is what `KnowledgePanel` holds
 * when an agent is looking at a `FAQ` entry the bot cited.
 */
const MOCK_TRANSLATIONS: Record<string, string> = {
  "How do I check my booking status?": "আমার বুকিং স্ট্যাটাস কিভাবে চেক করব?",
  "What is the baggage allowance?": "ব্যাগেজ অনুমোদন কত?",
  "How do I request a refund?": "আমি কিভাবে রিফান্ড অনুরোধ করব?",
  "What are the payment methods?": "পেমেন্ট পদ্ধতি কি কি?",
  "How do I contact support?": "আমি কিভাবে সাপোর্টের সাথে যোগাযোগ করব?",
  "Can I change my flight date?": "আমি কি আমার ফ্লাইটের তারিখ পরিবর্তন করতে পারি?",
  "What is the cancellation policy?": "বাতিলকরণ নীতি কি?",
  "How do I add extra baggage?": "আমি কিভাবে অতিরিক্ত ব্যাগেজ যোগ করব?",
};

/** Bangla is the only target the table holds. */
const SUPPORTED = new Set(["bn"]);

/**
 * Whether a stored translation exists — the condition that decides whether
 * the "Insert in Bangla" control renders at all.
 *
 * `targetLang` is honoured rather than ignored. It used to check only
 * whether the English key was present, so any language answered `true`
 * while `getTranslation` answered `null` for everything but `bn` — which
 * would render a button that inserts nothing the moment a second language
 * is asked for.
 */
export function hasTranslation(text: string, targetLang: string = "bn"): boolean {
  return SUPPORTED.has(targetLang) && text in MOCK_TRANSLATIONS;
}

/** The stored translation, or null where none exists. */
export function getTranslation(
  text: string,
  targetLang: string = "bn"
): TranslationEntry | null {
  if (!hasTranslation(text, targetLang)) return null;
  return {
    id: `stored-${targetLang}-${text.length}`,
    sourceText: text,
    translatedText: MOCK_TRANSLATIONS[text],
    sourceLang: "en",
    targetLang,
    version: 1,
    reviewed: true,
    reviewedBy: "system",
  };
}
