// The layout card grows when its 'More' disclosure opens, and it grows inside the lane
// under the canvas. Left unbounded that lane takes whatever the card asks for, and the
// model — the one thing in the window that cannot move, scroll or be put away — pays for
// it. (Left unbounded it also used to be a card laid across the middle of the kitchen,
// when the card hung off the bottom edge of the window; that argument is gone with the
// overlay, but the reason for it is not.)
//
// The cap is on the lane, and it is the only cap. jsdom computes no layout, so there is
// nothing here to measure; instead this reads the real stylesheet and does the arithmetic
// a browser would, for every height the workspace takes in the layouts the studio is
// actually used at. Two things it holds to: the model keeps the majority of the window,
// and the lane is never so short that the controls in it cannot be used.
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
// Comments stripped: they sit between rules and would otherwise be swallowed into the
// next rule's selector, and this file matches selectors exactly.
const source = css.replace(/\/\*[\s\S]*?\*\//g, '');

// The layout bar (51px) plus, beside it, the explode bar (~44px) and the gap between
// them: below this the lane cannot show the controls it exists for.
const USABLE_LANE = 112;
// The canvas keeps this share of the workspace at worst. It is the model's box; a lane
// that grows past it is the model being pushed out of its own window.
const MODEL_MAJORITY = 0.55;

// Workspace heights, from a short landscape phone up to a maximised desktop window:
// 900x560 and 1024x640 panels included, because that is the shape this went wrong in.
const VIEW_HEIGHTS = [388, 436, 516, 568, 640, 748, 900];

// Every max-height declared for the lane under the canvas, and only for the lane itself.
function laneCaps() {
  const caps = [];
  const block = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = block.exec(source))) {
    const applies = match[1]
      .split(',')
      .map(selector => selector.trim())
      .some(selector => selector === '.viewport-lane-bottom');
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

describe('the lane the layout card grows in', () => {
  const caps = laneCaps();

  test('declares a height cap at all', () => {
    expect(caps.length).toBeGreaterThan(0);
  });

  test.each(VIEW_HEIGHTS)('leaves the model the majority of a %ipx workspace', (container) => {
    for (const cap of caps) {
      // A hair of tolerance: these are percentages evaluated in floating point.
      expect(height(cap, container)).toBeLessThanOrEqual(container * (1 - MODEL_MAJORITY) + 1e-9);
    }
  });

  test.each(VIEW_HEIGHTS)('keeps a usable lane at %ipx', (container) => {
    for (const cap of caps) {
      expect(height(cap, container)).toBeGreaterThanOrEqual(USABLE_LANE);
    }
  });

  // The canvas is the element that must not be pushed: it takes what is left, and it may
  // shrink, so a lane that ignores its cap still cannot squeeze the model off the screen.
  test('the canvas is the flexible one, and it is allowed to shrink', () => {
    expect(source).toMatch(/\.viewport\{[^}]*flex:1/);
    expect(source).toMatch(/\.viewport\{[^}]*min-height:0/);
  });

  // One owner for the rule. A second cap on the card itself would measure against a lane
  // whose height is only a maximum, do nothing, and look exactly like the thing holding
  // the card back.
  test('the card declares no cap of its own, so there is only one owner', () => {
    expect(source).not.toMatch(/\.layout-widget(?!\.is-collapsed)[^{}]*\{[^{}]*max-height/);
  });

  // Capping a lane is only half of it: whatever it refuses to show has to be reachable,
  // and the bar with Move / Rotate / Merge / Done — the controls the card exists for —
  // must not be the part that scrolls away.
  test('scrolls the extras, and never the bar', () => {
    expect(source).toMatch(/\.viewport-lane-bottom\{[^}]*overflow:auto/);
    expect(source).toMatch(/\.layout-widget:not\(\.is-collapsed\) \.layout-extra\{[^}]*overflow-y:auto/);
    expect(source).not.toMatch(/\.layout-widget:not\(\.is-collapsed\) \.layout-bar\{[^}]*overflow/);
  });
});
