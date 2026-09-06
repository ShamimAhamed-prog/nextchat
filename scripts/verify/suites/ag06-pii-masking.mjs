import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";

await goto("/inbox");

// 1. Masked by default
const masked = await evaluate(`
  (() => {
    const panel = document.querySelectorAll('aside')[document.querySelectorAll('aside').length - 1];
    return panel.innerText;
  })()
`);
ok("contact fields masked on load", masked.includes("•"), masked.split("\n").filter(l => l.includes("•")).join(" | "));
ok("no raw email visible", !masked.includes("tanvir.rahman@example.com"));
ok("no raw phone visible", !masked.includes("1766 988803"));
ok("payment ref masked", !masked.includes("BK7729X"));
await shot("ag06-1-masked");

// 2. Reveal asks for a reason (tenant default has piiRevealRequiresReason on)
await evaluate(`
  [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').startsWith('Reveal phone')).click()
`);
await sleep(600);
const dialog = await evaluate(`document.querySelector('[role="dialog"]')?.innerText ?? ""`);
ok("reveal opens reason dialog", dialog.includes("Reveal phone"), dialog.split("\n")[0]);
ok("dialog says it is audited", /activity history/i.test(dialog));
const submitDisabled = await evaluate(`
  [...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Reveal')?.disabled ?? null
`);
ok("cannot reveal without a reason", submitDisabled === true);
await shot("ag06-2-reason-dialog");

// 3. Give a reason and reveal
await evaluate(`
  (() => {
    const input = document.querySelector('[role="dialog"] input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Calling the passenger back about the failed ticketing');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()
`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(b => b.textContent.trim() === 'Reveal').click()`);
await sleep(700);

const after = await evaluate(`
  (() => {
    const asides = document.querySelectorAll('aside');
    return asides[asides.length - 1].innerText;
  })()
`);
ok("phone now visible", after.includes("1766 988803"));
ok("email still masked", !after.includes("tanvir.rahman@example.com"));
ok("reveal written to activity", after.includes("Phone revealed"), (after.split("\n").find(l => l.includes("Phone revealed")) || ""));
ok("audit records who and why", after.includes("Calling the passenger back"));
ok("dialog closed", (await evaluate(`document.querySelector('[role="dialog"]') === null`)) === true);
await shot("ag06-3-revealed");

// 4. Hide re-masks
await evaluate(`
  [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').startsWith('Hide phone')).click()
`);
await sleep(500);
const hidden = await evaluate(`
  (() => { const a = document.querySelectorAll('aside'); return a[a.length-1].innerText; })()
`);
ok("hide re-masks the value", !hidden.includes("1766 988803"));
ok("audit entry survives the hide", hidden.includes("Phone revealed"));
await shot("ag06-4-rehidden");

ws.close();
