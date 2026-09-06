import { AGENT_ROSTER, YOU, YOUR_ROUTING } from "@/lib/people";
import type { TenantConfig } from "../admin/tenantConfigEngine";
import type { AgentState, Conversation } from "./inboxEngine";

/**
 * RT-01: "Route by tenant, queue, required skill, language, channel
 * permission, availability and remaining concurrency before applying
 * weighted selection."
 *
 * The order in that sentence is the order here, and it matters: weighting is
 * the *last* step, applied only to agents who already passed every hard
 * filter. Weighting first and filtering after is the bug this ordering
 * exists to prevent — it produces a confident selection of someone who was
 * never allowed to take the work.
 *
 * RT-10 then asks for "assignment reason, eligible candidate count,
 * effective weights, selected agent and reassignment history" to be exposed.
 * That is why every candidate carries the reason it failed rather than being
 * dropped: a routing decision you cannot read is a routing decision you
 * cannot debug at 3am.
 */
export type Candidate = {
  agent: string;
  eligible: boolean;
  /** Why not — the first hard filter this agent failed. */
  reason: string;
  /** Queue base weight (RT-03), before load is considered. */
  baseWeight: number;
  /** Base weight scaled by remaining capacity — the selection score. */
  effectiveWeight: number;
  activeCount: number;
  capacity: number;
};

export type RoutingDecision = {
  queueId: string;
  queueName: string;
  requiredSkill?: string;
  candidates: Candidate[];
  eligibleCount: number;
  selected: string | null;
  /** The one-line summary that goes into the activity trail. */
  reason: string;
  decidedAt: number;
};

type RoutingAgent = {
  name: string;
  queues: string[];
  skills: string[];
  languages: string[];
  channels: string[];
  activeCount: number;
  state: AgentState;
};

/**
 * The roster as routing sees it. `YOU` is assembled from live state — their
 * availability is the agent-state control and their load is the number of
 * conversations actually held — rather than a static row that would drift
 * from what the workspace is showing.
 */
export function routingRoster(
  conversations: Conversation[],
  yourState: AgentState,
): RoutingAgent[] {
  const yourLoad = conversations.filter(
    (c) => c.status === "assigned" && c.ownerLeaseActive,
  ).length;

  return [
    { name: YOU, ...YOUR_ROUTING, activeCount: yourLoad, state: yourState },
    ...AGENT_ROSTER.map((a) => ({
      name: a.name,
      queues: a.queues,
      skills: a.skills,
      languages: a.languages,
      channels: a.channels,
      activeCount: a.activeCount,
      state: a.state as AgentState,
    })),
  ];
}

/** Matches `canAcceptWork` in the engine — Available and Busy only. */
function availableForWork(state: AgentState): boolean {
  return state === "available" || state === "busy";
}

/**
 * The conversation's language as routing sees it. `language` is free text on
 * the record ("Bangla (types Banglish)"), so it is matched by containment
 * rather than equality.
 */
function speaks(agent: RoutingAgent, conversationLanguage: string): boolean {
  return agent.languages.some((l) => conversationLanguage.toLowerCase().includes(l.toLowerCase()));
}

export function routeConversation(
  convo: Conversation,
  roster: RoutingAgent[],
  config: TenantConfig,
  now: number,
): RoutingDecision {
  const queue = config.queues.queues.find((q) => q.id === convo.queueId) ?? config.queues.queues[0];

  const candidates: Candidate[] = roster.map((agent) => {
    const base = {
      agent: agent.name,
      baseWeight: queue.baseWeight,
      activeCount: agent.activeCount,
      capacity: queue.maxConcurrency,
    };
    const fail = (reason: string): Candidate => ({
      ...base,
      eligible: false,
      reason,
      effectiveWeight: 0,
    });

    // Hard filters, in RT-01's order.
    if (!agent.queues.includes(queue.id)) return fail(`Not in ${queue.name}`);
    if (convo.requiredSkill && !agent.skills.includes(convo.requiredSkill)) {
      return fail(`Missing skill "${convo.requiredSkill}"`);
    }
    if (!speaks(agent, convo.language)) return fail(`Does not cover ${convo.language}`);
    if (!agent.channels.includes(convo.channel)) return fail(`Not permitted on ${convo.channel}`);
    if (!availableForWork(agent.state)) return fail(`Unavailable (${agent.state})`);
    if (agent.activeCount >= queue.maxConcurrency) {
      return fail(`At capacity (${agent.activeCount}/${queue.maxConcurrency})`);
    }

    // Weighted selection, last: base weight scaled by remaining capacity, so
    // a heavier-weighted agent who is nearly full yields to a lighter one
    // with room. Deterministic — no random tie-break to make routing
    // unexplainable after the fact.
    const remaining = (queue.maxConcurrency - agent.activeCount) / queue.maxConcurrency;
    return {
      ...base,
      eligible: true,
      reason: "Eligible",
      effectiveWeight: Math.round(queue.baseWeight * remaining * 100) / 100,
    };
  });

  const eligible = candidates.filter((c) => c.eligible);
  const selected =
    [...eligible].sort(
      (a, b) => b.effectiveWeight - a.effectiveWeight || a.agent.localeCompare(b.agent),
    )[0] ?? null;

  return {
    queueId: queue.id,
    queueName: queue.name,
    requiredSkill: convo.requiredSkill,
    candidates,
    eligibleCount: eligible.length,
    selected: selected?.agent ?? null,
    reason: selected
      ? `${selected.agent} selected from ${eligible.length} eligible of ${candidates.length} — ${queue.name}, weight ${selected.effectiveWeight}`
      : `No eligible agent in ${queue.name} — ${candidates.length} checked`,
    decidedAt: now,
  };
}
