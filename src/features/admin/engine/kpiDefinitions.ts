import { YOU } from "@/shared/lib/people";

/**
 * SUP-07: "Version KPI definitions and recompute historical data only
 * through an explicit, labelled backfill."
 *
 * The requirement is really about one failure mode: someone changes how a
 * number is computed, every historical figure silently shifts, and nobody
 * can tell whether last quarter got better or the formula did. So the two
 * things are deliberately decoupled here — publishing a new definition
 * version advances what *new* data is computed under, and does **not** touch
 * history. History moves only when a backfill is run, and a backfill will
 * not run without a label.
 *
 * That decoupling is the whole point, so the mismatch is surfaced rather
 * than hidden: while `historyComputedUnder` trails `current`, the dashboard
 * says so on the figures themselves.
 */
export type KpiId = "fcr" | "ai_containment" | "handover" | "paid_not_ticketed";

export type KpiDefinition = {
  id: KpiId;
  label: string;
  /** The definition in words — what a reviewer actually needs to compare. */
  formula: string;
};

export const INITIAL_DEFINITIONS: KpiDefinition[] = [
  {
    id: "fcr",
    label: "First-Contact Resolution",
    formula: "Conversations resolved without a transfer or reopen ÷ all resolved conversations, per calendar day.",
  },
  {
    id: "ai_containment",
    label: "AI Containment",
    formula: "Conversations closed with no human ownership lease ÷ all conversations opened.",
  },
  {
    id: "handover",
    label: "Handover Rate",
    formula: "Conversations that took a human lease ÷ all conversations opened.",
  },
  {
    id: "paid_not_ticketed",
    label: "Paid, Not Ticketed (open)",
    formula: "Open conversations whose booking is paid with no ticket issued, counted live rather than rolled up.",
  },
];

export type KpiVersion = {
  version: number;
  definitions: KpiDefinition[];
  publishedBy: string;
  publishedAt: number;
  note: string;
};

export type BackfillRun = {
  id: string;
  /** Required. A backfill with no label is the thing this requirement bans. */
  label: string;
  fromVersion: number;
  toVersion: number;
  requestedBy: string;
  requestedAt: number;
  status: "running" | "complete";
};

export type KpiState = {
  versions: KpiVersion[];
  /** Version new data is computed under. */
  current: number;
  /** Version the stored history was computed under — moves only on backfill. */
  historyComputedUnder: number;
  /** Unsaved edits to the definitions, before they become a version. */
  draft: KpiDefinition[];
  backfills: BackfillRun[];
};

export function initialKpiState(): KpiState {
  const now = Date.now();
  return {
    versions: [
      {
        version: 1,
        definitions: INITIAL_DEFINITIONS,
        publishedBy: "System",
        publishedAt: now,
        note: "Initial definitions",
      },
    ],
    current: 1,
    historyComputedUnder: 1,
    draft: INITIAL_DEFINITIONS,
    backfills: [],
  };
}

/** True while history is attributed to an older definition than current. */
export function historyIsStale(s: KpiState): boolean {
  return s.historyComputedUnder < s.current;
}

export function draftDiffers(s: KpiState): boolean {
  const published = s.versions.find((v) => v.version === s.current)?.definitions ?? [];
  return s.draft.some((d) => published.find((p) => p.id === d.id)?.formula !== d.formula);
}

export type KpiAction =
  | { type: "EDIT_DEFINITION"; id: KpiId; formula: string }
  | { type: "DISCARD_DRAFT" }
  | { type: "PUBLISH_VERSION"; note: string }
  | { type: "RUN_BACKFILL"; label: string }
  | { type: "COMPLETE_BACKFILL"; id: string };

export function kpiReducer(state: KpiState, action: KpiAction): KpiState {
  switch (action.type) {
    case "EDIT_DEFINITION":
      return {
        ...state,
        draft: state.draft.map((d) => (d.id === action.id ? { ...d, formula: action.formula } : d)),
      };

    case "DISCARD_DRAFT":
      return {
        ...state,
        draft: state.versions.find((v) => v.version === state.current)?.definitions ?? state.draft,
      };

    case "PUBLISH_VERSION": {
      if (!draftDiffers(state) || !action.note.trim()) return state;
      const version = state.current + 1;
      return {
        ...state,
        current: version,
        versions: [
          ...state.versions,
          {
            version,
            definitions: state.draft,
            publishedBy: YOU,
            publishedAt: Date.now(),
            note: action.note.trim(),
          },
        ],
        // history deliberately untouched — that is the requirement.
      };
    }

    case "RUN_BACKFILL": {
      if (!action.label.trim() || !historyIsStale(state)) return state;
      return {
        ...state,
        backfills: [
          {
            id: `bf-${Date.now().toString(36)}`,
            label: action.label.trim(),
            fromVersion: state.historyComputedUnder,
            toVersion: state.current,
            requestedBy: YOU,
            requestedAt: Date.now(),
            status: "running",
          },
          ...state.backfills,
        ],
      };
    }

    case "COMPLETE_BACKFILL": {
      const run = state.backfills.find((b) => b.id === action.id);
      if (!run || run.status !== "running") return state;
      return {
        ...state,
        historyComputedUnder: run.toVersion,
        backfills: state.backfills.map((b) =>
          b.id === action.id ? { ...b, status: "complete" } : b,
        ),
      };
    }
  }
}
