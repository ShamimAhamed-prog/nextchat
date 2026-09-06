/**
 * The mechanical WCAG 2.2 AA sweep, as an expression to `evaluate` in the
 * page.
 *
 * It lives here rather than inside `suites/nfr11-axe-audit.mjs` because two
 * suites now run it — once in each theme. A light palette that has never been
 * measured is a light palette that fails AA somewhere, and the whole point of
 * `--color-ink-dim` being 4.5:1 in dark was that someone measured it.
 *
 * Not in `suites/`: the runner treats every `.mjs` in that directory as a
 * suite to execute.
 */
export const AUDIT = `
(() => {
  const out = { name: [], label: [], alt: [], heading: [], dupId: [], tabindex: [], contrast: [], focus: [] };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' ' + (el.className || '').toString().slice(0, 40);

  const accName = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const t = labelledby.split(/\\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
      if (t) return t;
    }
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    const text = (el.innerText || el.textContent || '').trim();
    if (text) return text;
    const img = el.querySelector('img[alt]');
    if (img && img.getAttribute('alt').trim()) return img.getAttribute('alt').trim();
    return '';
  };

  // 1. Controls with no accessible name (4.1.2)
  for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="menuitemradio"], select')) {
    if (!visible(el)) continue;
    if (!accName(el)) out.name.push(describe(el));
  }

  // 2. Inputs with no label (3.3.2 / 1.3.1)
  for (const el of document.querySelectorAll('input:not([type="hidden"]), textarea')) {
    if (!visible(el)) continue;
    const id = el.id;
    const hasFor = id && document.querySelector('label[for="' + CSS.escape(id) + '"]');
    const wrapped = el.closest('label');
    if (!hasFor && !wrapped && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      out.label.push(describe(el));
    }
  }

  // 3. Images without alt (1.1.1)
  for (const el of document.querySelectorAll('img')) {
    if (!el.hasAttribute('alt')) out.alt.push(describe(el));
  }

  // 4. Heading order (1.3.1) — no skipped levels
  const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map(h => Number(h.tagName[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) out.heading.push('h' + levels[i - 1] + ' -> h' + levels[i]);
  }

  // 5. Duplicate ids (4.1.1)
  const seen = new Map();
  for (const el of document.querySelectorAll('[id]')) {
    seen.set(el.id, (seen.get(el.id) || 0) + 1);
  }
  for (const [id, n] of seen) if (n > 1) out.dupId.push(id + ' x' + n);

  // 6. Positive tabindex (2.4.3)
  for (const el of document.querySelectorAll('[tabindex]')) {
    if (Number(el.getAttribute('tabindex')) > 0) out.tabindex.push(describe(el));
  }

  // 7. Text contrast (1.4.3) — AA needs 4.5:1, or 3:1 for large text
  const lum = (c) => {
    const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  /**
   * getComputedStyle answers in rgb(), rgba(), or — for anything Tailwind's
   * \`/opacity\` modifier compiles to a color-mix() — the modern
   * \`color(srgb r g b / a)\` form, whose channels are 0-1 rather than 0-255.
   * Reading those as 0-255 turns a 10%-coral tint into a near-black
   * background, and the alpha then goes unread as well, so a translucent
   * layer is treated as opaque. Both together invent contrast failures on
   * exactly the elements a theme is most likely to get right.
   */
  const parseColor = (s) => {
    if (!s || s === 'transparent' || s === 'none') return null;
    if (!/^(rgba?|color)\\(/.test(s)) return null;
    const n = (s.match(/-?\\d*\\.?\\d+(?:e[-+]?\\d+)?/gi) || []).map(Number);
    if (n.length < 3) return null;
    const unit = s.startsWith('color(') ? 255 : 1;
    return { rgb: n.slice(0, 3).map((v) => Math.min(255, Math.max(0, Math.round(v * unit)))),
             alpha: n.length > 3 ? n[3] : 1 };
  };
  const parse = (s) => parseColor(s)?.rgb ?? null;
  // The page's own background, so the walk up the tree has something true to
  // stop at rather than the dark theme's #202020 baked in as a constant.
  const pageBg = parse(getComputedStyle(document.body).backgroundColor) || [32, 32, 32];
  // Returns null when the answer is a gradient rather than a colour: walking
  // past a background-image and blaming the page behind it is how a white
  // label on the brand gradient button gets reported as 1.1:1 against the
  // page — a finding that is not real, and that buries the ones that are.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parseColor(cs.backgroundColor);
      if (c && c.alpha > 0.85) return c.rgb;
      n = n.parentElement;
    }
    return pageBg;
  };
  for (const el of document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, label, li, td, th, div')) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      out.contrast.push(ratio.toFixed(2) + ':1 need ' + need + ' — "' + (el.innerText || '').trim().slice(0, 34) + '" ' + cs.color + ' on rgb(' + bg.join(',') + ')');
    }
  }

  return out;
})()
`;
