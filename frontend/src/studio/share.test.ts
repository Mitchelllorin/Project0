import {encodeState, decodeState, readShareHash} from './share';

describe('share links', () => {
  it('round-trips a full configuration', () => {
    const state = {
      id: 'abc-123',
      configuration: {layout: 'l-shape', finish: 'oak', widths: {B01: 762}, groups: [], quote: {show_prices: true}},
      brand: {name: '3D Learning Family', subtitle: 'Project Zero — Kitchen Visualizer', accent: '#dca55e'},
      palette: {id: 'graphite', hue: 0, sat: 0.1},
    };
    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it('survives Unicode brand names and symbols', () => {
    const state = {brand: {name: 'Küchen & Söhne — Atelier № 4'}};
    expect(decodeState(encodeState(state)).brand.name).toBe('Küchen & Söhne — Atelier № 4');
  });

  it('reads the design out of a URL hash', () => {
    const encoded = encodeState({configuration: {layout: 'galley'}});
    expect(readShareHash(`#d=${encoded}`).configuration.layout).toBe('galley');
  });

  it('returns null for missing or corrupt fragments', () => {
    expect(readShareHash('')).toBeNull();
    expect(readShareHash('#d=%7Bbroken')).toBeNull();
    expect(readShareHash('#other=1')).toBeNull();
  });
});
