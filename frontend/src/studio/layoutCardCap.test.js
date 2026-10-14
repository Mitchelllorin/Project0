// The layout card and the explode bar share one column — `.model-controls` — and the
// column is what is pinned to the bottom edge of the 3D area (bottom:46px) and grows
// *upward* when the card's one row folds open. Left unbounded it rises past the vertical
// centre and stands on the model — a 298px card over the middle of the kitchen at
// 1024x640, which is exactly where a cabinet gets dragged.
//
// The cap is declared on the column and not on the card. The column is the element that
// is pinned and the element that grows; a cap on a card inside a flex column, measured
// against a parent whose height is only a maximum, resolves to nothing — a guard that
// reads as one and is not. jsdom computes no layout, so there is nothing here to measure.
// Instead this reads the real stylesheet and does the arithmetic a browser would, for
// every height the 3D area takes in the layouts the studio is actually used at. If a rule
// ever hands the column back more height than the corner it lives in can spare, this
// fails here instead of on someone's screen.
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
// Comments sit between rules and would otherwise be swallowed into the *next* rule's
// selector by the pattern below — and this file matches selectors exactly now, so a rule
// that shares its name with a paragraph of prose would measure as nothing at all.
const source = css.replace(/\/\*[\s\S]*?\*\//g, '');

const COLUMN_BOTTOM = 46; // .model-controls{bottom:46px}
// bottom:46px plus the 27px status bar and a gap: the column never reaches the bottom
// edge of the window either.
const EDGE_CLEARANCE = 98;
const CENTRE_MARGIN = 16; // how far below the middle of the 3D area the column starts
// The layout bar (51px) plus, under it, the explode bar (~44px) and the 14px gap between
// them. The two strips share this corner now, so the floor has to hold both of them: any
// lower and the card is squeezed under its own bar.
const USABLE_COLUMN = 112;

// `.viewport-wrap` heights, from a short landscape phone up to a maximised
// desktop window: 900x560 and 1024x640 panels included, because that is the
// shape this went wrong in.
const VIEW_HEIGHTS = [388, 436, 516, 568, 640, 748, 900];

// Every max-height declared for the pinned column, and only for the column itself —
// `.model-controls>.explode-controls`, for one, sets its own and is not this.
function columnCaps() {
  const caps = [];
  const block = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = block.exec(source))) {
    const applies = match[1]
      .split(',')
      .map(selector => selector.trim())
      .some(selector => selector === '.model-controls');
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

describe('the column the layout card and the explode bar share', () => {
  const caps = columnCaps();

  test('declares a height cap at all', () => {
    expect(caps.length).toBeGreaterThan(0);
  });

  test.each(VIEW_HEIGHTS)('cannot rise into the middle of a %ipx 3D area', (container) => {
    for (const cap of caps) {
      const allowed = height(cap, container);
      const top = container - COLUMN_BOTTOM - allowed;
      expect(top).toBeGreaterThanOrEqual(container / 2 + CENTRE_MARGIN);
    }
  });

  test.each(VIEW_HEIGHTS)('stays inside a %ipx 3D area, clear of the bottom edge', (container) => {
    for (const cap of caps) {
      expect(height(cap, container)).toBeLessThanOrEqual(container - EDGE_CLEARANCE);
    }
  });

  // The floor is what keeps the corner usable on a view too short to respect the
  // rule above: the strips and their gap have to survive the cap.
  test.each(VIEW_HEIGHTS)('keeps a usable column at %ipx', (container) => {
    for (const cap of caps) {
      expect(height(cap, container)).toBeGreaterThanOrEqual(USABLE_COLUMN);
    }
  });

  // One owner for the rule. A second cap on the card itself would measure against the
  // column's auto height, do nothing, and look exactly like the thing that was holding
  // the card out of the middle of the window.
  test('the card declares no cap of its own, so there is only one owner', () => {
    expect(source).not.toMatch(/\.layout-widget(?!\.is-collapsed)[^{}]*\{[^{}]*max-height/);
  });

  // Capping a column is only half of it: whatever it refuses to show has to be
  // reachable, and the bar with Move / Rotate / Merge / Done — the controls the
  // card exists for — must not be the part that scrolls away.
  test('scrolls the extras, and never the bar', () => {
    expect(source).toMatch(/\.layout-widget:not\(\.is-collapsed\) \.layout-extra\{[^}]*overflow-y:auto/);
    expect(source).not.toMatch(/\.layout-widget:not\(\.is-collapsed\) \.layout-bar\{[^}]*overflow/);
  });
});
