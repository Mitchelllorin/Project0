// The blueprint theme: slate navy chrome, cyan for anything carrying an answer, and a dark
// room behind the model.
//
// This is the one theme that is not a rotation of the studio's own — a hue shift cannot turn
// a warm near-grey into navy, because rotating something close to grey produces another thing
// close to grey. So it is derived by rule from the studio's base instead, and these are the
// rules: what reads as colour becomes the cyan, what reads as grey becomes navy slate, and
// lightness is carried over rather than invented.
//
// The assertions are on hue and lightness rather than on hex literals, so the theme can be
// tuned without rewriting them — but the two that matter (the app background is navy, the
// brass is cyan) are pinned to real values as well.
import {BASE, BLUEPRINT, BLUEPRINT_BASE, DEFAULT_PALETTE, PALETTE_BASES, PALETTE_PRESETS,
  applyPalette, baseNameOf, baseOf, blueprintOf, viewerBackgroundOf} from './palette';

const channels = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
const rgbOf = hex => {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  if (max === min) return {hue: null, lightness: l, saturation: 0};
  const d = (max - min) / 255;
  const s = (l > .5 ? d / (2 - max / 255 - min / 255) : d / (max / 255 + min / 255));
  const hue = max === r ? ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / (max - min) + 2) * 60 : ((r - g) / (max - min) + 4) * 60;
  return {hue, lightness: l, saturation: s};
};

describe('one colour of the studio theme, as the blueprint theme would have it', () => {
  it('turns the chrome a navy slate, not a green one', () => {
    const slate = rgbOf(blueprintOf('#2b302c'));
    expect(slate.hue).toBe(220);
    expect(slate.saturation).toBeLessThan(.25);
    expect(slate.lightness).toBeLessThan(.2);
  });

  it('turns the colour in the theme into the cyan, at the lightness it had', () => {
    const studio = rgbOf('#e3c492');          // the warm brass the studio accents with
    const derived = rgbOf(blueprintOf('#e3c492'));
    // Within a degree: the theme is kept in css hex, and 196° does not survive being
    // quantised to 8 bits per channel. What has to be true is the hue, not the float.
    expect(Math.round(derived.hue)).toBe(196);
    expect(derived.lightness).toBeCloseTo(studio.lightness, 2);
    // ...and it is a cyan rather than a blue: more green than the navy above.
    expect(channels(blueprintOf('#e3c492'))[1]).toBeGreaterThan(channels(blueprintOf('#2b302c'))[1]);
  });

  it('keeps a translucent colour translucent', () => {
    // Half the stylesheet's variables carry alpha; dropping it would make a scrim opaque.
    expect(blueprintOf('#76896a55')).toHaveLength(9);
    expect(blueprintOf('#76896a55').endsWith('55')).toBe(true);
  });

  it('has an answer for every variable the studio theme defines', () => {
    Object.entries(BASE).forEach(([name, hex]) => {
      const derived = blueprintOf(hex);
      expect(derived).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
      expect(derived).not.toBe('');
      expect(name).toMatch(/^--c\d+$/);
    });
    expect(Object.keys(BLUEPRINT_BASE)).toEqual(Object.keys(BASE));
  });

  // The two anchors, in real values: the app background lands on the reference's navy, and
  // the accent lands in the cyan it writes its readings in.
  it('puts the studio on the reference\u2019s navy, with its cyan on top', () => {
    expect(Math.round(rgbOf(BLUEPRINT_BASE['--c1']).hue)).toBe(220);
    expect(BLUEPRINT_BASE['--c1']).toBe('#121418');
    expect(Math.round(rgbOf(BLUEPRINT_BASE['--c10']).hue)).toBe(196);
    expect(BLUEPRINT_BASE['--c13']).toBe('#99def7');
  });
});

describe('which base a palette is drawn on', () => {
  it('is the preset\u2019s own, named', () => {
    expect(baseNameOf({id: 'blueprint', hue: 0, sat: 1})).toBe('blueprint');
    expect(baseNameOf({id: 'graphite', hue: 0, sat: .1})).toBe('studio');
    expect(baseOf({id: 'blueprint'})).toBe(BLUEPRINT_BASE);
    expect(baseOf({id: 'sage'})).toBe(BASE);
    expect(PALETTE_BASES.blueprint).toBe(BLUEPRINT_BASE);
  });

  // A slider makes the palette custom. It does not make it a different theme, and it must
  // not: dragging the hue on the navy theme would otherwise snap the studio back to olive.
  it('is carried across when the sliders take the palette over', () => {
    expect(baseNameOf({id: 'custom', base: 'blueprint', hue: 25})).toBe('blueprint');
    expect(baseNameOf({id: 'custom', hue: 25})).toBe('studio');
  });

  it('falls back to the studio\u2019s own for anything it does not know', () => {
    expect(baseNameOf({id: 'custom', base: 'chartreuse'})).toBe('studio');
    expect(baseNameOf(null)).toBe('studio');
    expect(baseNameOf(undefined)).toBe('studio');
    expect(baseOf({})).toBe(BASE);
  });
});

describe('the room the theme puts the model in', () => {
  it('is the dark stage for the blueprint, and the studio\u2019s own floor for everything else', () => {
    expect(viewerBackgroundOf({id: 'blueprint', hue: 0, sat: 1})).toBe(BLUEPRINT.backdrop);
    expect(viewerBackgroundOf(BLUEPRINT)).toBe('#0a1018');
    expect(viewerBackgroundOf({id: 'graphite', hue: 0, sat: .1})).toBeNull();
    expect(viewerBackgroundOf({id: 'custom', base: 'blueprint'})).toBe(BLUEPRINT.backdrop);
    expect(viewerBackgroundOf(undefined)).toBeNull();
  });
});

describe('applying a palette', () => {
  it('writes the blueprint base and its navy tokens onto the document', () => {
    applyPalette({id: 'blueprint', hue: 0, sat: 1});
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--c1')).toBe(BLUEPRINT_BASE['--c1']);
    expect(style.getPropertyValue('--c10')).toBe(BLUEPRINT_BASE['--c10']);
    expect(style.getPropertyValue('--background')).toBe('220 16.00% 9%');
    expect(style.getPropertyValue('--foreground')).toBe('220 16.00% 91%');
  });

  it('leaves the studio\u2019s own themes exactly as they were', () => {
    applyPalette({id: 'graphite', hue: 0, sat: .1});
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--c1')).toBe('#181918');
    expect(style.getPropertyValue('--background')).toBe('150 0.50% 9%');
  });

  it('opens on the blueprint, and still offers every theme it offered before', () => {
    expect(DEFAULT_PALETTE).toBe(BLUEPRINT);
    expect(PALETTE_PRESETS.map(preset => preset.id)).toEqual(['blueprint', 'graphite', 'midnight', 'violet', 'ember', 'sage']);
    // A palette that has never been applied still resolves: the studio boots on a theme.
    expect(() => applyPalette(undefined)).not.toThrow();
  });
});
