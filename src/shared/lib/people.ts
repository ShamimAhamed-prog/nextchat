/**
 * The people this prototype pretends to employ, in one place.
 *
 * This is the "shared mock-data layer" the TODO anticipated, scoped to what
 * had actually started to drift rather than to everything. `YOU` was declared
 * twice — once in `inboxEngine.ts`, once in `tenantConfigEngine.ts` — and
 * "Nabila K." existed three times: as the second approver, as a row in the
 * agent roster, and as a hand-typed transfer destination. `RolesAndAccess`
 * was already importing the same people from two different modules to
 * assemble one list, which is the point at which two copies stop being
 * harmless.
 *
 * Conversations, tenant config and chart geometry are deliberately *not*
 * here. Each already lives in exactly one module, and moving them into a
 * shared bag would trade a real boundary for a junk drawer.
 */

/** The signed-in agent, and the actor recorded on every audited action. */
export const YOU = "Rifat Karim";

/** The second authorised approver ADM-03's maker-checker requires. */
export const SECOND_APPROVER = "Nabila K.";

/** Who attendance exceptions (Phase 1 #8) notify — a distinct name rather
 *  than overloading `SECOND_APPROVER`, which this file's own history
 *  already flagged once as a problem when one person wears too many hats. */
export const MANAGER = "Kamrul Hasan";

/** SUP-06's floor: below this many eligible conversations, no rank is shown. */
export const MIN_QA_SAMPLE = 30;

/**
 * RT-01 routes on "tenant, queue, required skill, language, channel
 * permission, availability and remaining concurrency". Six of those seven
 * are properties of an *agent*, and the roster used to carry none of them —
 * it was QA scorecard numbers and nothing else. These are the attributes
 * routing actually needs, so eligibility can be evaluated rather than
 * assumed.
 */
export type RosterEntry = {
  name: string;
  /** Queue ids from tenant config (`queues.queues`). */
  queues: string[];
  skills: string[];
  languages: string[];
  /** Channel permission — an agent may be trained on WhatsApp but not web. */
  channels: string[];
  /** Conversations already held. `YOU`'s is counted live instead. */
  activeCount: number;
  /** Availability, using the same vocabulary as the agent-state control. */
  state: "available" | "busy" | "wrap_up" | "away" | "break" | "training" | "offline";
  // QA scorecard figures (SUP-06), unrelated to routing.
  sample: number;
  fcr: number;
  csat: number;
  ahtMinutes: number;
};

/**
 * Illustrative roster for the QA/scorecard minimum-sample demo (SUP-06).
 * `YOU` is deliberately absent: their sample is the live resolved-conversation
 * count, not a static number, so `AgentScorecards` prepends them.
 */
export const AGENT_ROSTER: RosterEntry[] = [
  {
    name: "Shirin Akter",
    queues: ["q1", "q2"],
    skills: ["refunds", "reissue", "general"],
    languages: ["Bangla", "English", "Banglish"],
    channels: ["WhatsApp", "Website", "Messenger"],
    activeCount: 2,
    state: "available",
    sample: 142, fcr: 0.78, csat: 4.6, ahtMinutes: 6.4,
  },
  {
    name: "Arif Chowdhury",
    // General queue only, and no refunds skill — so a refund case routes
    // past him even when he is the least loaded agent on the floor.
    queues: ["q1"],
    skills: ["general", "group-booking"],
    languages: ["Bangla", "Banglish"],
    channels: ["WhatsApp", "Website"],
    activeCount: 0,
    state: "available",
    sample: 67, fcr: 0.71, csat: 4.3, ahtMinutes: 8.1,
  },
  {
    name: SECOND_APPROVER,
    queues: ["q2"],
    skills: ["refunds", "general"],
    languages: ["English"],
    channels: ["WhatsApp", "Website", "Messenger"],
    activeCount: 3,
    state: "training",
    sample: 18, fcr: 0.66, csat: 4.1, ahtMinutes: 7.2,
  },
];

/** `YOU`'s routing attributes; state and load come from live inbox state. */
export const YOUR_ROUTING = {
  queues: ["q1", "q2"],
  skills: ["refunds", "reissue", "general", "group-booking"],
  languages: ["Bangla", "English", "Banglish"],
  channels: ["WhatsApp", "Website", "Messenger"],
};

/** Everyone a role or a transfer can be assigned to, most senior first. */
export const ALL_PEOPLE: string[] = [YOU, ...AGENT_ROSTER.map((a) => a.name)];
