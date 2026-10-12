// The layout card hangs 95px above the bottom of the 3D area and grows *upward*
// when the 'More' disclosure opens. Left unbounded it rises past the vertical
// centre and stands on the model — a 298px card over the middle of the kitchen
// at 1024x640, which is exactly where a cabinet gets dragged.
//
// jsdom computes no layout, so there is nothing here to measure. Instead this
// reads the real stylesheet and does the arithmetic the browser does, for every
// height the 3D area takes in the layouts the studio is actually used at. If a
// rule ever hands the card back more height than the corner it lives in can
// spare, this fails here instead of on someone's screen.
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');

const CARD_BOTTOM = 95; // .layout-widget{bottom:95px}
const DOCK_CLEARANCE = 115; // bottom:95px + the camera dock's own 31px + 47px
const CENTRE_MARGIN = 16; // how far below the middle of the 3D area the card starts
const USABLE_CARD = 80; // the bar alone is 51px plus its padding: never go below this

// `.viewport-wrap` heights, from a short landscape phone up to a maximised
// desktop window: 900x560 and 1024x640 panels included, because that is the
// shape this went wrong in.
const VIEW_HEIGHTS = [388, 436, 516, 568, 640, 748, 900];

// Every max-height declared for the card while it is open. The collapsed pill is
// a label a few characters wide, not the card, so it is excluded — its own rule
// deliberately unbounds it to keep it hugging its text.
function openCardCaps() {
  const caps = [];
  const block = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = block.exec(css))) {
    const applies = match[1]
      .split(',')
      .map(selector => selector.trim())
      .some(selector => /\.layout-widget(?!\.is-collapsed)/.test(selector));
    if (!applies) continue;
    const declared = /max-height:([^;}]+)/.exec(match[2]);
    if (declared) caps.push(declared[1].trim());
  }
  return caps;
}

// `50%`, `calc(50% - 111px)`, `min(a,b)` and `max(a,b)`, evaluated against one
// container height — the arithmetic the browser would do.
function height(value, container) {
  const text = value.trim();
  const nested = /^(min|max)\((.*)\)$/.exec(text);
  if (nested) {
    const parts = splitTopLevel(nested[2]).map(part => height(part, container));
    return nested[1] === 'min' ? Math.min(...parts) : Math.max(...parts);
  }
  const calc = /^calc\(([\d.]+)%\s*([-+])\s*([\d.]+)px\)$/.exec(text);
  if (calc) {
    const percent = (container * parseFloat(calc[1])) / 100;
    const pixels = parseFloat(calc[3]);
    return calc[2] === '-' ? percent - pixels : percent + pixels;
  }
  const percent = /^([\d.]+)%$/.exec(text);
  if (percent) return (container * parseFloat(percent[1])) / 100;
  const pixels = /^([\d.]+)px$/.exec(text);
  if (pixels) return parseFloat(pixels[1]);
  throw new Error(`cannot measure max-height:${value}`);
}

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map(part => part.trim());
}

describe('the open layout card', () => {
  const caps = openCardCaps();

  test('declares a height cap at all', () => {
    expect(caps.length).toBeGreaterThan(0);
  });

  test.each(VIEW_HEIGHTS)('cannot rise into the middle of a %ipx 3D area', (container) => {
    for (const cap of caps) {
      const allowed = height(cap, container);
      const top = container - CARD_BOTTOM - allowed;
      expect(top).toBeGreaterThanOrEqual(container / 2 + CENTRE_MARGIN);
    }
  });

  test.each(VIEW_HEIGHTS)('stays inside a %ipx 3D area, clear of the camera dock', (container) => {
    for (const cap of caps) {
      expect(height(cap, container)).toBeLessThanOrEqual(container - DOCK_CLEARANCE);
    }
  });

  // The floor is what keeps the card usable on a view too short to respect the
  // rule above: the bar and its padding have to survive the cap.
  test.each(VIEW_HEIGHTS)('keeps a usable card at %ipx', (container) => {
    for (const cap of caps) {
      expect(height(cap, container)).toBeGreaterThanOrEqual(USABLE_CARD);
    }
  });

  // Capping a card is only half of it: whatever it refuses to show has to be
  // reachable, and the bar with Move / Rotate / Merge / Done — the controls the
  // card exists for — must not be the part that scrolls away.
  test('scrolls the extras, and never the bar', () => {
    expect(css).toMatch(/\.layout-widget:not\(\.is-collapsed\) \.layout-extra\{[^}]*overflow-y:auto/);
    expect(css).not.toMatch(/\.layout-widget:not\(\.is-collapsed\) \.layout-bar\{[^}]*overflow/);
  });
});
