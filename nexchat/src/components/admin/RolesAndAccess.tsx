"use client";

import { useState } from "react";
import { useTenantConfig } from "./TenantConfigContext";
import { SECOND_APPROVER } from "./tenantConfigEngine";
import { ALL_PEOPLE, YOU } from "@/lib/people";
import { useNow } from "../dashboard/useCountdown";

// One list, from one place — this used to be assembled from two modules.
const KNOWN_PEOPLE = ALL_PEOPLE;
const BREAK_GLASS_MINUTES = [30, 60, 120];

/**
 * ADM-02's role composition and ADM-03's break-glass access, both real:
 * a role's `privileged` flag is what actually gates
 * the Changes & audit pane's approval review (see
 * `canApproveSensitiveChanges`), and a break-glass grant is a genuine,
 * time-limited override of that same check — not a form with nothing
 * behind it. Immediate and audited rather than routed through the
 * draft/publish pipeline the six config domains above use — see the
 * `ADD_ROLE`/`GRANT_BREAK_GLASS` reducer cases in `tenantConfigEngine.ts`
 * for why that line was drawn here.
 */
export default function RolesAndAccess() {
  const { state, dispatch } = useTenantConfig();
  const now = useNow();
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePrivileged, setNewRolePrivileged] = useState(false);
  const [bgPerson, setBgPerson] = useState(SECOND_APPROVER);
  const [bgReason, setBgReason] = useState("");
  const [bgMinutes, setBgMinutes] = useState(60);

  const { roles, roleAssignments } = state.published.security;
  const roleFor = (person: string) => roleAssignments.find((a) => a.person === person)?.roleId ?? "";
  const inUseRoleIds = new Set(roleAssignments.map((a) => a.roleId));
  const grant = state.breakGlass;
  const grantRemainingMin = grant ? Math.max(0, Math.ceil((grant.expiresAt - now) / 60_000)) : 0;

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Roles &amp; access</span>
        <p className="text-xs text-ink-dim">
          Only a privileged role (or an active break-glass grant) can approve a sensitive change — real gate, not a label.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {roles.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">{r.name}</span>
              {r.privileged && <span className="rounded-full border border-amber/50 px-2 py-0.5 text-[10px] font-semibold text-amber">Privileged</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_ROLE_PRIVILEGED", id: r.id, privileged: !r.privileged })}
                className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:border-ink-dim"
              >
                {r.privileged ? "Unmark privileged" : "Mark privileged"}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "REMOVE_ROLE", id: r.id })}
                disabled={inUseRoleIds.has(r.id)}
                title={inUseRoleIds.has(r.id) ? "Reassign anyone using this role first" : undefined}
                className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            aria-label="New role name"
            placeholder="New role name"
            className="h-9 min-w-[10rem] flex-1 rounded-lg border border-line bg-footer px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-xs text-ink-dim">
            <input type="checkbox" checked={newRolePrivileged} onChange={(e) => setNewRolePrivileged(e.target.checked)} />
            Privileged
          </label>
          <button
            type="button"
            disabled={!newRoleName.trim()}
            onClick={() => {
              dispatch({ type: "ADD_ROLE", name: newRoleName.trim(), privileged: newRolePrivileged });
              setNewRoleName("");
              setNewRolePrivileged(false);
            }}
            className="h-9 shrink-0 rounded-full bg-[linear-gradient(90deg,var(--color-grad-from),var(--color-grad-to))] px-3 text-[12.5px] font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add role
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Assignments</span>
        {KNOWN_PEOPLE.map((person) => (
          <div key={person} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <span className="text-sm text-ink">
              {person}
              {person === YOU && <span className="text-ink-dim"> (you)</span>}
            </span>
            <select
              value={roleFor(person)}
              onChange={(e) => dispatch({ type: "ASSIGN_ROLE", person, roleId: e.target.value })}
              aria-label={`Assign role for ${person}`}
              className="h-8 rounded-lg border border-line bg-card px-2 text-xs text-ink focus:border-coral focus:outline-none"
            >
              <option value="" disabled className="bg-footer">
                Unassigned
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-footer">
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Break-glass access</span>
        {grant ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-coral/40 bg-coral/5 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {grant.person} — expires in <span className="font-[family-name:var(--font-inter)] tabular-nums text-coral">{grantRemainingMin}m</span>
              </p>
              <p className="truncate text-xs italic text-ink-dim">
                &ldquo;{grant.reason}&rdquo; — granted by {grant.grantedBy}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: "REVOKE_BREAK_GLASS" })}
              className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:border-coral hover:text-coral"
            >
              Revoke
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select value={bgPerson} onChange={(e) => setBgPerson(e.target.value)} aria-label="Person for break-glass access" className="h-9 flex-1 rounded-lg border border-line bg-footer px-2 text-sm text-ink focus:border-coral focus:outline-none">
                {KNOWN_PEOPLE.map((p) => (
                  <option key={p} value={p} className="bg-footer">
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={bgMinutes}
                onChange={(e) => setBgMinutes(Number(e.target.value))}
                aria-label="Break-glass duration"
                className="h-9 rounded-lg border border-line bg-card px-2 text-sm text-ink focus:border-coral focus:outline-none"
              >
                {BREAK_GLASS_MINUTES.map((m) => (
                  <option key={m} value={m} className="bg-footer">
                    {m}m
                  </option>
                ))}
              </select>
            </div>
            <input
              value={bgReason}
              onChange={(e) => setBgReason(e.target.value)}
              aria-label="Reason for break-glass access"
            placeholder="Reason (required — this is an emergency override, not the normal path)"
              className="h-9 rounded-lg border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-dim focus:border-coral focus:outline-none"
            />
            <button
              type="button"
              disabled={!bgReason.trim()}
              onClick={() => {
                dispatch({ type: "GRANT_BREAK_GLASS", person: bgPerson, reason: bgReason.trim(), minutes: bgMinutes });
                setBgReason("");
              }}
              className="h-9 self-start rounded-full border border-coral/50 px-3 text-[12.5px] font-medium text-coral transition-colors hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Grant temporary access
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
