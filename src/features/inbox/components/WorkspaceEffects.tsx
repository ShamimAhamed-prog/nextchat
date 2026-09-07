"use client";

import { useEffect, useRef } from "react";
import { useInbox } from "../context/InboxContext";
import { useTenantConfig } from "@/features/admin/context/TenantConfigContext";
import { canAcceptWork, canAutoRetry, heldByAgent, nextDeliveryState } from "../engine/inboxEngine";
import { routeConversation, routingRoster } from "../engine/routing";

/**
 * Time-based transitions that must fire regardless of which page is
 * mounted, now that `/inbox` and `/dashboard` share one `InboxProvider`
 * (see the workspace layout). Before that sharing existed, an offer or
 * snooze timing out was driven by a `useCountdown` hook inside whichever
 * component happened to be showing it (`OfferBanner`, `ChatPanel`) — fine
 * when that component was always on screen, but a supervisor watching the
 * live queue from `/dashboard` while an offer expires on a screen nobody's
 * looking at needs the deadline enforced regardless. A real backend would
 * own this with a server-side timer; this is the client-side equivalent,
 * mounted once at the layout so it runs no matter which page is active.
 * The per-component countdowns still exist for their visual ticking display
 * and may fire the same action a moment earlier — safe, since the reducer
 * guards every transition on current status already.
 */
export default function WorkspaceEffects() {
  const { state, dispatch } = useInbox();
  const { state: configState } = useTenantConfig();

  // Use refs to hold latest values so the interval effect doesn't re-run
  const conversationsRef = useRef(state.conversations);
  const dispatchRef = useRef(dispatch);
  // Which conversations have already raised an SLA-breach notification, so
  // the tick below fires once per breach rather than once per 2 seconds for
  // as long as a conversation sits past its deadline.
  const notifiedBreachRef = useRef<Set<string>>(new Set());

  // Update refs via effect to avoid render-phase ref updates
  useEffect(() => {
    conversationsRef.current = state.conversations;
  }, [state.conversations]);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // No ref-guard needed: this effect firing once per *real* mount (surviving
  // React Strict Mode's dev-time double-invoke correctly) is exactly what we
  // want, since the layout that mounts `WorkspaceEffects` only mounts once
  // per session — it persists across /inbox <-> /dashboard navigation rather
  // than remounting. A ref guard here actually breaks this: Strict Mode's
  // discarded first pass sets it before the real pass runs, so the real
  // timer never gets scheduled at all — caught by testing this live, not by
  // reading the code, since it looks correct until you watch for the offer
  // that never arrives.
  useEffect(() => {
    const t = window.setTimeout(() => dispatch({ type: "SIMULATE_INCOMING_OFFER" }), 7000);
    return () => window.clearTimeout(t);
  }, [dispatch]);

  // Phase 1 #3's simulated incoming call — same one-shot-timeout idiom as
  // the offer above, at a different delay so the two demo events don't
  // land on top of each other. `SIMULATE_INCOMING_CALL` itself no-ops if a
  // call is already ringing/connected or there's nothing to call about.
  useEffect(() => {
    const t = window.setTimeout(() => dispatch({ type: "SIMULATE_INCOMING_CALL" }), 12000);
    return () => window.clearTimeout(t);
  }, [dispatch]);

  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now();
      for (const c of conversationsRef.current) {
        if (c.status === "offered" && c.offerExpiresAt && c.offerExpiresAt <= now) {
          dispatchRef.current({ type: "OFFER_TIMEOUT", id: c.id });
        }
        if (c.status === "snoozed" && c.snoozeUntil && c.snoozeUntil <= now) {
          dispatchRef.current({ type: "SNOOZE_WOKE", id: c.id });
        }
        // Notification-center #4/#6: a waiting conversation crossing its SLA
        // deadline raises an "overdue" notification once, not every tick —
        // and the guard clears the moment it stops waiting, so a reopened
        // or re-queued conversation can breach and notify again later.
        const waiting = c.status === "queued" || c.status === "offered";
        if (waiting && c.slaDeadline <= now) {
          if (!notifiedBreachRef.current.has(c.id)) {
            notifiedBreachRef.current.add(c.id);
            dispatchRef.current({ type: "RAISE_SLA_NOTIFICATION", id: c.id });
          }
        } else {
          notifiedBreachRef.current.delete(c.id);
        }
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, []);

  // RT-01/RT-10. The reducer deliberately has no access to tenant config, and
  // routing needs queue weights and concurrency from it — so the decision is
  // computed here, where both providers are in scope, and recorded onto the
  // conversation. Guarded on `!routingDecision`, and every path that returns
  // work to the pool clears it, so a re-queue is routed afresh rather than
  // inheriting a decision that already picked someone who said no.
  useEffect(() => {
    const needing = state.conversations.filter(
      (c) => !c.routingDecision && (c.status === "queued" || c.status === "offered"),
    );
    if (needing.length === 0) return;
    const roster = routingRoster(state.conversations, state.agentState);
    const now = Date.now();
    for (const c of needing) {
      dispatch({
        type: "RECORD_ROUTING",
        id: c.id,
        decision: routeConversation(c, roster, configState.published, now),
      });
    }
  }, [state.conversations, state.agentState, configState.published, dispatch]);

  /**
   * INB-09. Delivery is a channel telling you what happened, so it advances
   * on a clock rather than at dispatch — and it can fail.
   *
   * Whether a send succeeds is a *real rule*, not a coin flip: a message can
   * only be delivered on a channel the tenant has enabled. That makes the
   * failure path deterministic and demonstrable — disable Messenger in
   * Settings and Messenger sends fail, enable it and they go through — and it
   * ties this requirement to the channel model INB-12 already uses instead of
   * inventing a second notion of "sendable".
   *
   * Retry is bounded by `MAX_SEND_ATTEMPTS`. When it runs out the failure
   * becomes terminal and stops retrying, because a silent infinite loop is
   * how a customer waits forever for a message nobody knows was never sent.
   */
  useEffect(() => {
    const enabled = new Set<string>(
      configState.published.brand.channels.filter((c) => c.enabled).map((c) => c.id),
    );
    const channelId: Record<string, string | undefined> = {
      WhatsApp: "whatsapp",
      Website: "web",
      Messenger: "messenger",
    };

    const timers: number[] = [];
    for (const c of state.conversations) {
      const id = channelId[c.channel];
      const deliverable = Boolean(id && enabled.has(id));
      for (const m of c.transcript) {
        const d = m.delivery;
        if (!d) continue;

        if (d.state === "queued") {
          timers.push(
            window.setTimeout(() => {
              if (deliverable) dispatch({ type: "ADVANCE_DELIVERY", id: c.id, msgId: m.id });
              else
                dispatch({
                  type: "FAIL_DELIVERY",
                  id: c.id,
                  msgId: m.id,
                  reason: `${c.channel} is disabled for this tenant — nothing can be delivered on it`,
                });
            }, 700),
          );
        } else if (nextDeliveryState(c.channel, d.state)) {
          timers.push(
            window.setTimeout(
              () => dispatch({ type: "ADVANCE_DELIVERY", id: c.id, msgId: m.id }),
              d.state === "sent" ? 900 : 1400,
            ),
          );
        } else if (canAutoRetry(d)) {
          timers.push(
            window.setTimeout(
              () => dispatch({ type: "RETRY_SEND", id: c.id, msgId: m.id }),
              1200,
            ),
          );
        }
      }
    }
    return () => timers.forEach(window.clearTimeout);
  }, [state.conversations, configState.published.brand.channels, dispatch]);

  // AG-11's other half: the warning is advice, this is the rule. Once the
  // agent has been unable to take work for longer than the tenant's
  // unattended timeout, anything they are still holding goes back to the
  // queue with an audit entry, whichever screen is open.
  useEffect(() => {
    if (canAcceptWork(state.agentState) || state.unavailableSince === null) return;
    const limitMs = configState.published.sla.unattendedMinutes * 60_000;

    const t = window.setInterval(() => {
      if (state.unavailableSince === null) return;
      if (Date.now() - state.unavailableSince < limitMs) return;
      for (const c of heldByAgent(state.conversations)) {
        dispatch({ type: "UNATTENDED_TIMEOUT", id: c.id });
      }
    }, 2000);
    return () => window.clearInterval(t);
  }, [state.agentState, state.unavailableSince, state.conversations, configState.published.sla.unattendedMinutes, dispatch]);

  return null;
}
