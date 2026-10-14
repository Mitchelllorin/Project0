// The dismiss control is the interaction this panel exists to offer, so it is
// driven here the way a viewer uses it rather than asserted from the markup:
// render the panel, click dismiss, expect the pill, click the pill, expect the
// panel back.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {ExplodeControls} from './Inspector';

const mockSetExplode = jest.fn();
jest.mock('./StudioContext', () => ({
  useStudio: () => ({explode: 0.65, setExplode: mockSetExplode}),
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

function render(props = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<ExplodeControls {...props}/>));
  return container;
}

const byTestId = (c, id) => c.querySelector(`[data-testid="${id}"]`);

// React tracks a controlled input's value itself, so setting `.value` and firing
// `input` is swallowed unless the native setter is used to make the change visible.
function drag(node, value){
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(node, value);
    node.dispatchEvent(new Event('input', {bubbles: true}));
  });
}

beforeEach(() => mockSetExplode.mockClear());

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

  it('keeps a working slider in the pill, so collapsing takes the panel and not the control', () => {
    const c = render();
    act(() => byTestId(c, 'explode-dismiss').click());
    const mini = byTestId(c, 'explode-slider-mini');
    expect(mini).not.toBeNull();
    // In the pill itself, not a second copy left behind in the panel.
    expect(mini.parentElement).toBe(byTestId(c, 'explode-controls'));
    expect(mini.getAttribute('type')).toBe('range');
    expect(mini.getAttribute('aria-label')).toBe('Explode assembly');

    drag(mini, '34');
    expect(mockSetExplode).toHaveBeenCalledWith(0.34);
  });

  it('leaves only one slider on screen at a time', () => {
    const c = render();
    expect(byTestId(c, 'explode-slider-mini')).toBeNull();
    act(() => byTestId(c, 'explode-dismiss').click());
    expect(byTestId(c, 'explode-slider')).toBeNull();
  });

  // The same strip is drawn over the workspace and over the assembly explorer. In the
  // workspace it takes apart one cabinet where it stands, so it says which one; in the
  // explorer the selection *is* the view, so the plain name is the honest one.
  it('names the cabinet it takes apart when it is over the workspace', () => {
    const c = render({subject: 'B01'});
    expect(byTestId(c, 'explode-title').textContent).toContain('Explode B01 in place');
  });

  it('keeps the plain name where the assembly is the whole view', () => {
    const c = render();
    expect(byTestId(c, 'explode-title').textContent).toContain('Exploded assembly');
  });

  it('carries that name into the pill, so putting it away does not rename it', () => {
    const c = render({subject: 'B01'});
    act(() => byTestId(c, 'explode-dismiss').click());
    expect(byTestId(c, 'explode-expand').textContent).toContain('Explode B01 in place');
  });

  it('offers the named stages that drive the explode amount', () => {
    const c = render();
    ['assembled', 'panels', 'hardware', 'fasteners'].forEach(stage => {
      expect(byTestId(c, `explode-stage-${stage}`)).not.toBeNull();
    });
  });
});
