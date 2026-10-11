// The dismiss control is the interaction this panel exists to offer, so it is
// driven here the way a viewer uses it rather than asserted from the markup:
// render the panel, click dismiss, expect the pill, click the pill, expect the
// panel back.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {ExplodeControls} from './Inspector';

jest.mock('./StudioContext', () => ({
  useStudio: () => ({explode: 0.65, setExplode: jest.fn()}),
}));
// react-router-dom v7 resolves 'react-router/dom' through an exports map that
// CRA's jest-resolve does not understand; the panel only needs useNavigate.
jest.mock('react-router-dom', () => ({useNavigate: () => jest.fn()}));
// Inspector.jsx co-locates the 3D canvas, and `three`'s CJS build does not load
// under jsdom. The explode panel uses neither, so both are stubbed.
jest.mock('@react-three/fiber', () => ({Canvas: () => null}));
jest.mock('@react-three/drei', () => ({OrbitControls: () => null}));
jest.mock('./PartGeometry', () => ({Panel: () => null, PartMesh: () => null, Part: () => null}));

// React only flushes updates inside act() when this flag is set.
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<ExplodeControls/>));
  return container;
}

const byTestId = (c, id) => c.querySelector(`[data-testid="${id}"]`);

describe('ExplodeControls', () => {
  it('opens on the assembly with the dismiss control and the current stage', () => {
    const c = render();
    expect(byTestId(c, 'explode-controls')).not.toBeNull();
    expect(byTestId(c, 'explode-dismiss')).not.toBeNull();
    expect(byTestId(c, 'explode-percentage').textContent).toBe('65%');
    expect(byTestId(c, 'explode-slider')).not.toBeNull();
  });

  it('dismisses to a pill and comes back from it', () => {
    const c = render();
    act(() => byTestId(c, 'explode-dismiss').click());
    expect(byTestId(c, 'explode-controls').className).toContain('is-collapsed');
    expect(byTestId(c, 'explode-dismiss')).toBeNull();
    expect(byTestId(c, 'explode-expand')).not.toBeNull();

    act(() => byTestId(c, 'explode-expand').click());
    expect(byTestId(c, 'explode-controls').className).not.toContain('is-collapsed');
    expect(byTestId(c, 'explode-dismiss')).not.toBeNull();
  });

  it('is one row on the bottom edge: title, slider, stages and the way out', () => {
    // The middle of the screen is the product, so nothing may be centred over it
    // and the bar must not stack into a card. Everything is a sibling in one row.
    const c = render();
    const row = byTestId(c, 'explode-controls');
    expect(byTestId(c, 'explode-title').parentElement).toBe(row);
    expect(byTestId(c, 'explode-slider').parentElement).toBe(row);
    expect(byTestId(c, 'explode-stage-hardware').closest('.explode-stages').parentElement).toBe(row);
    expect(byTestId(c, 'explode-dismiss').parentElement).toBe(row);
    expect(row.querySelector('.explode-title-actions')).toBeNull();
  });

  it('uses the same dismiss control as every other floating panel', () => {
    const c = render();
    const dismiss = byTestId(c, 'explode-dismiss');
    expect(dismiss.className).toContain('panel-dismiss');
    expect(dismiss.getAttribute('aria-label')).toBe('Hide the explode controls');
    expect(dismiss.getAttribute('aria-expanded')).toBe('true');
  });

  it('offers the named stages that drive the explode amount', () => {
    const c = render();
    ['assembled', 'panels', 'hardware', 'fasteners'].forEach(stage => {
      expect(byTestId(c, `explode-stage-${stage}`)).not.toBeNull();
    });
  });
});
