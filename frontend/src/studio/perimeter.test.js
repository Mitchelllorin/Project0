// The model gets the centre of the window. Everything a viewer can press is
// drawn at the edge of it — a rail, two columns of type and a strip along the
// bottom — and nothing is anchored to the middle, because the middle is the
// kitchen and the middle is where a cabinet gets dragged.
//
// jsdom renders no layout and no cascade, so this reads the real stylesheet and
// resolves it the way a browser would: the last declaration for a property, in
// file order, wins. That is what makes it a check on the *effective* rule rather
// than on the presence of a string. The centred declarations are all still in
// the file, shadowed on purpose by the perimeter block at the end — this is what
// proves they are shadowed, so a later edit cannot quietly reinstate one.
//
// The vertical half of the same rule — how tall the layout card may grow before
// it reaches the middle — is held to its arithmetic in layoutCardCap.test.js.
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
// Comments stripped before parsing, because they sit *between* rules and the
// pattern below would otherwise swallow one into the next rule's selector.
const source = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Every `selector{declarations}` block, in file order. Nested at-rules flatten:
// the pattern cannot cross a brace, so `@media(...){.a{...}}` yields `.a{...}`.
// That is what a resolved check wants here, because file order is the order that
// decides, and the media conditions only ever restate a value rather than being
// the value itself.
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

// Anything that used to float over the model. Each one must be pinned to an
// edge: a `50%` left with a matching transform is the definition of "anchored
// to the middle", which is the thing this view exists without.
const OVERLAYS = ['.view-dock', '.layout-widget', '.explode-controls', '.connection-error'];

describe('the model owns the window', () => {
  test('the 3D area fills the workspace instead of sitting between two columns', () => {
    expect(resolved('.workspace', 'display')).toBe('block');
    expect(resolved('.viewport-wrap', 'position')).toBe('absolute');
    expect(resolved('.viewport-wrap', 'inset')).toBe('0');
  });

  test('the documents that replace it fill the same area', () => {
    expect(resolved('.document-page', 'position')).toBe('absolute');
    expect(resolved('.document-page', 'inset')).toBe('0');
  });

  test.each(OVERLAYS)('%s is pinned to an edge, never to the middle', selector => {
    expect(resolved(selector, 'left')).not.toBe('50%');
    expect(resolved(selector, 'transform')).not.toBe('translateX(-50%)');
  });

  // Not merely "not 50%": the strips have to clear the columns they now share
  // the perimeter with, and that is what the three width properties are for.
  //
  // This asks whether *a* rule sets each offset, not which one wins, because the
  // flattened source has lost the media conditions that choose between them —
  // the narrow-screen override is a real value at 700px and never applies on a
  // desktop, and neither ordering is wrong.
  test('the strips clear the rail and the columns they sit beside', () => {
    const declares = (selector, property) =>
      declarations(selector).filter(d => d.property === property).map(d => d.value);

    expect(declares('.view-dock', 'right')).toEqual(expect.arrayContaining([expect.stringContaining('--right-w')]));
    expect(declares('.layout-widget', 'left')).toEqual(expect.arrayContaining([expect.stringContaining('--rail-w')]));
    expect(declares('.explode-controls', 'left')).toEqual(expect.arrayContaining([expect.stringContaining('--rail-w')]));
    expect(declares('.viewport-heading', 'left')).toEqual(expect.arrayContaining([expect.stringContaining('--rail-w')]));
    expect(declares('.viewport-top-tools', 'right')).toEqual(expect.arrayContaining([expect.stringContaining('--right-w')]));
    expect(declares('.viewport-corner-label', 'left')).toEqual(expect.arrayContaining([expect.stringContaining('--rail-w')]));
    expect(declares('.viewport-bottom-right', 'right')).toEqual(expect.arrayContaining([expect.stringContaining('--right-w')]));
  });

  // The one that was actually wrong on screen: everything on the left edge was
  // offset past the *rail*, which put the caption, the corner label and the
  // layout card on top of the left column — type over type. They clear the
  // column, not just the rail, and this is the rule that says so.
  test.each(['.viewport-heading', '.viewport-corner-label', '.layout-widget', '.explode-controls'])(
    '%s starts where the left column ends, not where the rail does',
    selector => {
      const lefts = declarations(selector).filter(d => d.property === 'left').map(d => d.value);
      expect(lefts).toEqual(expect.arrayContaining([expect.stringContaining('--left-w')]));
    });
});

describe('the perimeter is type, not panels', () => {
  test.each(['.tool-rail', '.left-panel', '.right-panel'])('%s has no surface of its own', selector => {
    expect(resolved(selector, 'background')).toBe('none');
    expect(resolved(selector, 'border')).toBe('0');
  });

  test.each(['.view-dock', '.layout-widget', '.explode-controls'])('%s has given up its card', selector => {
    expect(resolved(selector, 'background')).toBe('none');
    expect(resolved(selector, 'border')).toBe('0');
    expect(resolved(selector, 'backdrop-filter')).toBe('none');
  });

  test('the words carry their own contrast, since no background does it for them', () => {
    // One shadow on the columns, inherited by every label inside them, and one
    // on each strip drawn over the scene: readable over a daylight floor and a
    // dark evening one without a panel behind any of it.
    expect(resolved('.left-panel', 'text-shadow')).toContain('--edge-shadow');
    expect(resolved('.view-dock', 'text-shadow')).toContain('--edge-shadow');
    expect(resolved('.viewport-heading h1', 'text-shadow')).toContain('--edge-shadow');
  });

  test('the three width properties the overlays read are declared at every breakpoint', () => {
    // Declared once in each media block that changes the chrome, so the strips
    // cannot drift from the columns they are clearing.
    expect(css).toMatch(/^:root\{[^}]*--rail-w:61px[^}]*--left-w:278px[^}]*--right-w:285px/m);
    expect(css).toMatch(/@media\(max-width:1250px\)\{:root\{[^}]*--rail-w:53px[^}]*--left-w:244px[^}]*--right-w:255px/);
    expect(css).toMatch(/@media\(max-width:1000px\)\{:root\{[^}]*--right-w:0px/);
    expect(css).toMatch(/@media\(max-width:700px\)\{:root\{[^}]*--rail-w:44px[^}]*--left-w:0px/);
  });
});
