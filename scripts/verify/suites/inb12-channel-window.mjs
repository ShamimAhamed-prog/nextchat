import { evaluate, shot, goto, sleep, ws, ok } from "../driver.mjs";


const composer = () =>
  evaluate(`
    (() => {
      const i = document.getElementById('agent-reply');
      if (!i) return { present: false };
      const wrap = i.closest('div.flex.flex-col');
      return {
        present: true,
        disabled: i.disabled,
        placeholder: i.placeholder,
        notice: wrap ? wrap.innerText : '',
      };
    })()
  `);

await goto("/inbox");

// c1 Tanvir — WhatsApp, customer messaged 2 minutes ago: window wide open.
let c = await composer();
ok("open window leaves the composer free", c.present && c.disabled === false, c.placeholder);
ok("no restriction notice inside the window", !/reply window/i.test(c.notice));
await shot("inb12-1-open");

// Same conversation, 25 hours later: the WhatsApp window has closed. Skewing
// the page clock is what a real day of waiting looks like to the policy,
// which reads Date.now() on every tick.
await evaluate(`
  (() => {
    const real = Date.now.bind(Date);
    const skew = 25 * 60 * 60 * 1000;
    Date.now = () => real() + skew;
    return true;
  })()
`);
// `useNow` ticks every 15s, so give the policy a real tick to land on.
await sleep(17000);

c = await composer();
ok("closed window disables free typing", c.disabled === true, c.placeholder);
ok("notice names the 24-hour window", /24-hour WhatsApp reply window/.test(c.notice), c.notice.slice(0, 70));
ok("approved templates are offered", /approved templates/i.test(c.notice) && /Ticket issued/.test(c.notice));
// Messenger is disabled tenant-wide and Website is not an outbound option,
// so this tenant genuinely has no alternative channel — claiming one would
// be the bug.
ok("no alternative is invented when none is enabled", !/can still reach/.test(c.notice));
await shot("inb12-2-closed");

// A template can still be sent, and lands in the transcript.
await evaluate(`
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ticket issued').click()
`);
await sleep(700);
const body = await evaluate(`document.body.innerText`);
ok("template send lands in the transcript", body.includes("Your e-ticket has been issued"));
await shot("inb12-3-template-sent");

ws.close();
