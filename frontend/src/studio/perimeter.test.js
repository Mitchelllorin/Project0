// Nothing is drawn over the model.
//
// This file used to hold a weaker rule — nothing anchored to the *middle* of the window,
// every strip pinned to an edge of it. But an edge of the window is still the kitchen, so
// the strips were still on the model, and so were the palette and the inspector. What it
// asserts now is a structure: the canvas box, `.viewport`, holds the canvas and nothing
// else, and every control is an item of a lane above or below it, in the flow of
// `.workspace`. A structure does not need keeping up to date when the window changes
// shape; a coordinate does, and that is what kept going wrong.
//
// jsdom renders no layout and no cascade, so this reads the real stylesheet and resolves
// it the way a browser would: the last declaration for a property, in file order, wins.
// That is what makes it a check on the *effective* rule rather than on the presence of a
// string. Comments are stripped before parsing, both because they sit between rules and
// would otherwise be swallowed into the next rule's selector, and because a comment that
// *names* a deleted property must not read as the property still being there.
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const source = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Every `selector{declarations}` block, in file order. Nested at-rules flatten: the
// pattern cannot cross a brace, so `@media(...){.a{...}}` yields `.a{...}`.
function declarations(selector) {
  const found = [];
  const block = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = block.exec(source))) {
    const selectors = match[1].split(',').map(part => part.trim());
    if (!selectors.includes(selector)) continue;
    for (const rule of match[2].split(';')) {
      const at = rule.indexOf(':');
      if (at < 0) continue;
      found.push({
        property: rule.slice(0, at).trim(),
        value: rule.slice(at + 1).replace(/!important/g, '').trim(),
      });
    }
  }
  return found;
}

function resolved(selector, property) {
  const all = declarations(selector).filter(declaration => declaration.property === property);
  return all.length ? all[all.length - 1].value : null;
}

// Everything that used to float over the model. Each one is an item of a lane now, so
// none of them may carry a corner of its own.
const STRIPS = ['.viewport-heading', '.viewport-top-tools', '.view-dock', '.model-controls',
  '.viewport-corner-label', '.viewport-bottom-right'];

describe('the model owns its box', () => {
  test('the workspace is a row of lanes and the middle one is the canvas column', () => {
    expect(resolved('.workspace', 'display')).toBe('flex');
    expect(resolved('.viewport-wrap', 'display')).toBe('flex');
    expect(resolved('.viewport-wrap', 'flex-direction')).toBe('column');
  });

  test('the canvas box is the flexible one, in flow, with no offsets of its own', () => {
    expect(resolved('.viewport', 'position')).toBe('relative');
    expect(resolved('.viewport', 'flex')).toBe('1');
    expect(resolved('.viewport', 'min-height')).toBe('0');
    expect(resolved('.viewport', 'inset')).toBe('auto');
  });

  test('the canvas still fills the box it was given', () => {
    expect(resolved('.viewport>div:has(>canvas)', 'position')).toBe('absolute');
    expect(resolved('.viewport>div:has(>canvas)', 'inset')).toBe('0');
  });

  // The palette and the inspector are lanes beside the model. Below 701px and 1001px
  // respectively there is no width for a fourth and fifth column, so there they are the
  // slide-overs they already were — opt-in, dismissable, and the only place in the studio
  // where a panel is still drawn over the canvas.
  test('the two columns become flow lanes above the width where they are slide-overs', () => {
    expect(source).toMatch(/@media\(min-width:701px\)\{\.left-panel\{[^}]*position:relative/);
    expect(source).toMatch(/@media\(min-width:1001px\)\{\.right-panel\{[^}]*position:relative/);
  });

  test.each(STRIPS)('%s is an item of a lane, never positioned against the window', selector => {
    expect(resolved(selector, 'position')).toBe('static');
    for (const corner of ['left', 'right', 'top', 'bottom', 'inset']) {
      expect(resolved(selector, corner)).toBe('auto');
    }
  });

  test('the lanes themselves are in the flow, not laid over the canvas', () => {
    expect(resolved('.viewport-lane', 'position')).toBe('relative');
    expect(resolved('.viewport-lane', 'display')).toBe('flex');
  });

  // The lane under the canvas is the one that can grow — the layout card opens into it —
  // so that is the one that is capped, and it scrolls what does not fit rather than
  // growing over the run. layoutCardCap.test.js holds it to the arithmetic.
  test('the lane under the canvas is capped, and scrolls what does not fit', () => {
    expect(resolved('.viewport-lane-bottom', 'max-height')).not.toBeNull();
    expect(resolved('.viewport-lane-bottom', 'overflow')).toBe('auto');
  });

  // Not merely shadowed — gone. A `50%` left with a matching transform is the exact idiom
  // for anchoring something to the middle of the window, and there is no middle to anchor
  // to any more: the box between the lanes is the model's.
  test('the stylesheet has no way to anchor anything to the middle of the window', () => {
    expect(source).not.toContain('left:50%');
    expect(source).not.toContain('translateX(-50%)');
  });

  // Three custom properties were added to keep strips clear of the two columns as the
  // window narrowed. No strip is drawn over the columns any more, so they are deleted
  // rather than left declared: a rule reaching for one now means nothing at all, and this
  // is what stops that being a silent no-op.
  test('the properties that existed only to dodge the columns are gone', () => {
    for (const property of ['--left-w', '--right-w', '--edge-gap']) {
      expect(source).not.toContain(property);
    }
    // ...and the one that is still read — the rail's width, for the phone slide-over —
    // is declared once per breakpoint that changes the chrome.
    expect(source).toMatch(/^:root\{--rail-w:61px/m);
    expect(source).toMatch(/@media\(max-width:1250px\)\{:root\{--rail-w:53px/);
    expect(source).toMatch(/@media\(max-width:700px\)\{:root\{--rail-w:44px/);
  });
});

describe('the chrome is type, not panels', () => {
  test.each(['.tool-rail', '.left-panel', '.right-panel'])('%s has no surface of its own', selector => {
    expect(resolved(selector, 'background')).toBe('none');
    expect(resolved(selector, 'border')).toBe('0');
  });

  test.each(['.view-dock', '.model-controls', '.explode-controls', '.layout-widget'])(
    '%s has given up its card', selector => {
      expect(resolved(selector, 'background')).toBe('none');
      expect(resolved(selector, 'border')).toBe('0');
      expect(resolved(selector, 'backdrop-filter')).toBe('none');
    });

  test('the box that holds the two strips is not a panel either', () => {
    expect(resolved('.model-controls', 'background')).toBe('none');
    expect(resolved('.model-controls', 'border')).toBe('0');
    expect(resolved('.model-controls', 'backdrop-filter')).toBe('none');
  });

  // The lanes are containers, never surfaces: nothing declares a fill, an edge or a
  // shadow on one, so there is nothing to override if a rule later tries to give it one
  // and nothing that reads as a panel behind the type.
  test('the lanes never grow a surface either', () => {
    expect(resolved('.viewport-lane', 'background')).toBeNull();
    expect(resolved('.viewport-lane', 'border')).toBeNull();
    expect(resolved('.viewport-lane', 'box-shadow')).toBeNull();
  });

  test('the strips give up their own corners to the lanes', () => {
    // Two strips, side by side in one lane: neither may claim a position of its own
    // inside it, or the pair could be drawn on top of one another.
    expect(source).toMatch(/\.model-controls>\.layout-widget,\.model-controls>\.explode-controls\{[^}]*position:static/);
  });

  test('the words carry their own contrast, since no background does it for them', () => {
    expect(resolved('.left-panel', 'text-shadow')).toContain('--edge-shadow');
    expect(resolved('.viewport-lane', 'text-shadow')).toContain('--edge-shadow');
    expect(resolved('.viewport-heading h1', 'text-shadow')).toContain('--edge-shadow');
  });
});
