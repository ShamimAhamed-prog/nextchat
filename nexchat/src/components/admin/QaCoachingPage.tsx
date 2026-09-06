"use client";

import { Avatar, Btn, EmptyState, Kpi, PageHead, Panel, Pill, type PillTone } from "./mockup/Primitives";

/** `/qa` — a direct replication of the mockup's `#qaView`. */

const REVIEW_QUEUE: { initials: string; color: string; title: string; sub: string; rubric: string; due: string; score: string; action: string }[] = [
  { initials: "AR", color: "#2f5f7c", title: "C-1027 · Paid not ticketed", sub: "Ayesha Rahman · P0 · risk-based", rubric: "Rubric v4.2", due: "Due today", score: "—", action: "Review" },
  { initials: "TH", color: "#584593", title: "C-1019 · Refund escalation", sub: "Tanvir Hasan · targeted sample", rubric: "Rubric v4.2", due: "Due tomorrow", score: "—", action: "Review" },
  { initials: "NJ", color: "#00694b", title: "C-1008 · Disruption rebooking", sub: "Nusrat Jahan · random sample", rubric: "Rubric v4.1", due: "Completed", score: "96", action: "Open" },
];

const APPEALS: { id: string; pill: string; tone: PillTone; time: string; detail: string; action: string }[] = [
  { id: "AP-018 · Policy accuracy", pill: "Under review", tone: "amber", time: "2h ago", detail: "Agent supplied a newer policy citation than the rubric reference.", action: "Review appeal" },
  { id: "AP-016 · Ownership score", pill: "Overdue", tone: "red", time: "3d ago", detail: "Calibration reviewer requested because two scores differ by 18 points.", action: "Assign reviewer" },
];

export default function QaCoachingPage() {
  return (
    <>
      <PageHead
        eyebrow="Quality and coaching"
        title="QA reviews and appeals"
        description="Random, risk-based and targeted sampling with versioned rubrics, calibrated reviewers and permission-safe appeals."
        actions={
          <>
            <Btn>Rubric v4.2</Btn>
            <Btn>Calibration history</Btn>
            <Btn primary modal="qa">Create sampling rule</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Review queue" delta="12 due" deltaTone="amber" value="38" note="Random 18 · risk 14 · targeted 6" />
        <Kpi label="QA score" delta="−0.6%" deltaTone="amber" value="91.2%" note="312 calibrated reviews" />
        <Kpi label="Reviewer agreement" delta="Target ≥85%" value="88.4%" note="Monthly calibration cohort" />
        <Kpi label="Open appeals" delta="2 overdue" deltaTone="amber" value="7" note="Median decision 2.1 days" />
        <Kpi label="Security findings" delta="No critical" value="3" note="All P2 · remediation assigned" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Review queue" hint="Transcript access follows reviewer role and PII masking policy" action={<Pill>Risk + random sampling</Pill>} bodyClass="">
          <div className="flex flex-col">
            {REVIEW_QUEUE.map((r) => (
              <div key={r.title} className="grid grid-cols-[36px_1.5fr_auto] items-center gap-2.5 border-b border-line px-4 py-3 text-[10px] last:border-0 lg:grid-cols-[36px_1.5fr_0.7fr_0.7fr_0.6fr_auto]">
                <Avatar initials={r.initials} color={r.color} size={32} />
                <div className="min-w-0">
                  <b className="text-[11px] font-bold text-ink">{r.title}</b>
                  <small className="mt-0.5 block text-ink-dim">{r.sub}</small>
                </div>
                <span className="hidden text-ink-dim lg:block">{r.rubric}</span>
                <span className="hidden text-ink-dim lg:block">{r.due}</span>
                <span className="hidden text-lg font-bold text-ink lg:block">{r.score}</span>
                <Btn modal="qa">{r.action}</Btn>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Appeals" hint="Agents see only their own restricted records" bodyClass="">
            {APPEALS.map((a) => (
              <div key={a.id} className="border-b border-line px-4 py-3.5 last:border-0">
                <header className="flex items-center gap-2">
                  <h3 className="text-[11px] font-bold text-ink">{a.id}</h3>
                  <Pill tone={a.tone}>{a.pill}</Pill>
                  <time className="ml-auto text-[9px] text-ink-dim">{a.time}</time>
                </header>
                <p className="my-2 text-[10px] leading-relaxed text-ink-muted">{a.detail}</p>
                <Btn modal="qa">{a.action}</Btn>
              </div>
            ))}
          </Panel>

          <Panel title="My scorecard" hint="Agent-safe self-service preview" bodyClass="">
            <EmptyState icon="✓" title="Own data only">
              Agents can inspect eligible source conversations, acknowledge coaching and submit a QA appeal without seeing peer data.
            </EmptyState>
          </Panel>
        </div>
      </div>
    </>
  );
}
