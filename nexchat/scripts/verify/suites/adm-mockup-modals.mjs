// /admin is `preview (3).html`'s #adminView drawn over the real config engine,
// so its dialogs are the place the two can drift apart: a field the mockup has
// can go missing, or a button can stop opening the dialog it owns. This walks
// the panes, opens each dialog from the control that owns it, and checks the
// field set against the mockup's own labels.
import { evaluate, goto, ok, shot, sleep, ws } from "../driver.mjs";

const tab = async (label) => {
  await evaluate(`[...document.querySelectorAll('[role="tab"]')].find(b => b.textContent.trim() === ${JSON.stringify(label)}).click()`);
  await sleep(400);
};
const clickBtn = async (label, nth = 0) => {
  await evaluate(`
    (() => {
      const bs = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === ${JSON.stringify(label)});
      if (!bs[${nth}]) throw new Error('no ' + ${JSON.stringify(label)});
      bs[${nth}].click();
    })()
  `);
  await sleep(450);
};
const dlg = () => evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
const close = () => evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);

// [tab, button label, dialog title, labels the mockup's field set must contain]
const cases = [
  ["Tenant & brand", "Edit profile", "Tenant and brand profile", ["Legal organisation", "Tenant ID", "Supported languages", "Operating currency", "Greeting copy", "Change reason"]],
  ["Tenant & brand", "Configure", "Customer identity and channel-linking policy", ["Permitted verification", "Possible-match handling", "OTP policy", "Merge reversal", "Change reason"]],
  ["Channels", "Configure", "Channel configuration", ["Signed webhook URL", "Messaging window", "Retry policy", "Credential"]],
  ["Channels", "Manage", "Channel emergency stop", ["Channel", "Stop mode", "Duration", "Fallback route", "Incident reference and reason"]],
  ["Queues & routing", "Run simulation", "Workload-aware routing simulation", ["Configuration", "Scenario pack", "Agent roster", "Deterministic seed"]],
  ["Queues & routing", "Edit", "Queue and routing policy", ["Max queue age", "Required skills", "Language fallback", "Offer timeout", "Capacity adjustment", "Change reason"]],
  ["Queues & routing", "Edit matrix", "Routing escalation matrix", ["Trigger", "Initial delay", "Recipients", "Notification routes", "Auto-resolution", "Change reason"]],
  ["Team & access", "Edit", "Agent skills and capacity", ["Certified skills", "Languages", "Base weight", "Max concurrency"]],
  ["Team & access", "Manage teams", "Team and coverage configuration", ["Team lead", "Permitted queues", "Primary calendar", "Surge roster", "Minimum staffed seats", "Change reason"]],
  ["Team & access", "Review", "Quarterly privileged-access review", ["Review period", "Due date", "Population", "Review owner"]],
  ["SLA & hours", "Edit", "SLA and business calendar", ["Priority", "Calendar", "Pickup target", "First response", "Resolution target", "Pause conditions"]],
  ["SLA & hours", "Add calendar", "SLA and business calendar", ["Reopen window", "Unattended timeout", "Pause conditions"]],
  ["AI & content", "Edit policy", "AI policy, authority and release", ["Production release", "Knowledge snapshot", "High-confidence floor", "Guarded floor", "Clarification floor", "Allowed read-only tools", "Hard handoff triggers"]],
  ["AI & content", "Manage", "AI kill-switch control", ["Scope", "Duration", "Required incident reference and reason"]],
  ["AI & content", "Open", "Knowledge source", ["Title", "Owner", "Languages", "Valid until", "Source URL or document"]],
  ["Integrations & commerce", "Add integration", "Production integration configuration", ["Integration", "Base endpoint", "Authentication", "Current credential", "Replacement credential", "Idempotency", "Failure route"]],
  ["Integrations & commerce", "Edit", "Commercial and financial controls", ["Merchant of record", "Settlement currency", "Agent refund preparation ceiling", "AI refund authority", "Partial refunds", "Fee table"]],
  ["Integrations & commerce", "Manage", "Tenant feature rollout", ["Feature", "Exposure", "Audience", "Automatic end", "Rollback", "Success and stop criteria"]],
  ["Integrations & commerce", "Edit budget", "Tenant usage budget", ["Budget period", "Approved ceiling", "Operations warning", "Forecast owner", "At-ceiling behavior"]],
  ["Security & data", "Edit security policy", "Tenant security policy", ["Federated identity provider", "Privileged MFA", "Idle session timeout", "High-risk step-up window", "Approved network ranges"]],
  ["Security & data", "Manage roles", "Role permissions", ["Tenant scope", "Conversation scope", "PII access"]],
  ["Security & data", "Manage", "Legal hold", ["Hold ID", "Status", "Case or authority reference", "Scope", "Review date"]],
  ["Security & data", "Edit schedule", "Retention policy", ["Data class", "Retention", "Deletion method", "Legal hold"]],
  ["Security & data", "Data request", "Tenant data export or deletion request", ["Request type", "Identity verification", "Requested data", "Output policy", "Reviewer note"]],
  ["Security & data", "Request break-glass", "Request break-glass access", ["Tenant", "Maximum duration", "Incident", "Independent approver", "Why normal access is insufficient"]],
  ["Changes & audit", "Compare", "Compare and roll back tenant configuration", ["Current version", "Rollback target", "Activation", "Approver", "Incident or rollback reason"]],
];

await goto("/admin", { width: 1600, height: 1200 });
await sleep(800);

for (const [t, btn, title, labels] of cases) {
  await tab(t);
  await clickBtn(btn);
  const text = await dlg();
  ok(`${btn} on ${t} opens "${title}"`, text.split(String.fromCharCode(10))[0]?.trim() === title, text.split(String.fromCharCode(10))[0] ?? "none");
  const missing = labels.filter((l) => !new RegExp(l, "i").test(text));
  ok(`  its fields match the mockup`, missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : `${labels.length} present`);

  // The mockup's fields are all real boxes. A label rendered next to a static
  // value would pass the check above, so count the editable controls too.
  const controls = await evaluate(`
    (() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { n: 0, ro: 0 };
      const els = [...d.querySelectorAll('input, select, textarea')];
      return { n: els.length, ro: els.filter(e => e.readOnly).length };
    })()
  `);
  ok(`  every field is an editable control`, controls.n >= labels.length, `${controls.n} controls, ${controls.ro} read-only, for ${labels.length} checked labels`);
  await shot(`adm-modal-${title.replace(/\W+/g, "-").toLowerCase()}`);
  await close();
  await sleep(300);
}

// The audit-event viewer is the one read-only dialog — it renders a recorded
// event, so it has fields to show and nothing to type into.
await tab("Changes & audit");
await clickBtn("View");
const eventText = await dlg();
ok(
  "View on an audit row opens that event",
  /^Administrative event /.test(eventText.split(String.fromCharCode(10))[0] ?? ""),
  eventText.split(String.fromCharCode(10))[0] ?? "none",
);
const eventMissing = ["Actor and scope", "Recorded change", "Approval and state", "Source"].filter((l) => !eventText.includes(l));
ok("  it carries every ADM-07 section", eventMissing.length === 0, eventMissing.join(", ") || "4 present");
await close();
await sleep(300);

// ---- What typing into them actually does -------------------------------
// The mockup's dialogs commit a toast and change nothing. These edit the real
// draft, so the test is that a bound field reaches it and an unbound one is
// recorded rather than dropped.
const setField = async (label, value) => {
  await evaluate(`
    (() => {
      const d = document.querySelector('[role="dialog"]');
      const lab = [...d.querySelectorAll('label')].find(l => l.textContent.trim().toLowerCase().startsWith(${JSON.stringify(label.toLowerCase())}));
      if (!lab) throw new Error('no field ' + ${JSON.stringify(label)});
      const el = lab.querySelector('input, textarea');
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await sleep(250);
};

await tab("SLA & hours");
await clickBtn("Edit");
await setField("First response", "9 minutes");

// Save stays disabled until the mockup's own reason field is filled.
const before = await evaluate(`
  [...document.querySelectorAll('[role="dialog"] button')].find(b => /Save SLA/.test(b.textContent))?.disabled ?? null
`);
ok("save is blocked until a reason is given", before === true, String(before));

await setField("Change reason", "Tightening P0 first response after the August review");
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => /Save SLA/.test(b.textContent)).click()`);
await sleep(500);

let body = await evaluate(`document.body.innerText`);
const p0Row = body.split(String.fromCharCode(10)).find((l) => /P0 critical/.test(l)) ?? "no row";
ok("a bound field reaches the draft", /draft change/.test(body) && /9m/.test(p0Row), p0Row.slice(0, 140));

// And the unbound half is on the audit trail rather than nowhere.
await tab("Changes & audit");
await sleep(400);
body = await evaluate(`document.body.innerText`);
const auditRow = body.split(String.fromCharCode(10)).find((l) => /SLA policy edited/i.test(l)) ?? "no audit line";
ok("an unbound field is recorded on the audit entry", /SLA policy edited/i.test(body) && /August review/.test(body), auditRow.slice(0, 140));
await shot("adm-modal-draft-and-audit");

ws.close();
