// Two things matter here and they are both about not getting in the way: the
// widget must not cover the model while you arrange it, and the layout workflow
// must still be complete. So the first test asserts what is deliberately NOT on
// screen, the second that one click brings all of it back.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutWidget} from './LayoutWidget';

let mockStudio;
jest.mock('./StudioContext', () => ({useStudio: () => mockStudio}));
jest.mock('sonner', () => ({toast: {success: jest.fn(), error: jest.fn()}}));
// The merge dialog is a Radix dialog; stubbing it lets the widget be driven in jsdom.
jest.mock('./MergeDialog', () => ({
  MergeDialog: ({open}) => (open ? <div data-testid="merge-dialog-stub"/> : null),
}));

function studioWith(overrides = {}) {
  return {
    config: {units: 'mm', custom: false, groups: [], finish: 'oak'},
    scene: {
      cabinets: [
        {id: 'B01', name: 'Base 30', width: 762, position: [0, 0, 304.8], rotation: 0},
        {id: 'B02', name: 'Base 30', width: 762, position: [762, 0, 304.8], rotation: 0},
      ],
    },
    selected: ['B01'],
    selectCabinet: jest.fn(),
    setArrange: jest.fn(),
    gizmoMode: 'translate',
    setGizmoMode: jest.fn(),
    setCabinetWidth: jest.fn(),
    addCabinet: jest.fn(),
    removeCabinet: jest.fn(),
    resetArrangement: jest.fn(),
    update: jest.fn(),
    ...overrides,
  };
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  mockStudio = studioWith();
});

function render() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<LayoutWidget/>));
  return container;
}

const byTestId = (c, id) => c.querySelector(`[data-testid="${id}"]`);
const openMore = c => act(() => byTestId(c, 'layout-more').click());

describe('LayoutWidget', () => {
  it('is one row of controls at rest, so it does not cover the model', () => {
    const c = render();
    expect(byTestId(c, 'layout-bar')).not.toBeNull();
    // Nothing heavy is in the DOM until it is asked for.
    ['layout-extra', 'layout-cabinet-select', 'layout-placement-readout', 'cabinet-width',
      'add-base', 'add-drawers', 'add-corner', 'add-corner-out',
      'remove-cabinet', 'reset-arrangement'].forEach(id => expect(byTestId(c, id)).toBeNull());
    // ...while the controls you actually reach for are on the row.
    ['gizmo-translate', 'gizmo-rotate', 'layout-merge', 'layout-more', 'layout-dismiss', 'done-arranging']
      .forEach(id => expect(byTestId(c, id)).not.toBeNull());
  });

  it('keeps the whole layout workflow one click away, and folds it back up', () => {
    const c = render();
    openMore(c);
    expect(byTestId(c, 'layout-more').getAttribute('aria-expanded')).toBe('true');
    expect(byTestId(c, 'layout-cabinet-select')).not.toBeNull();
    expect(byTestId(c, 'layout-position').textContent).toBe('0 mm · 305 mm');
    expect(byTestId(c, 'layout-rotation').textContent).toBe('0°');
    expect(byTestId(c, 'layout-group-readout').textContent).toContain('25.4 mm / 15°');
    expect(byTestId(c, 'cabinet-width').querySelectorAll('option')).toHaveLength(11);
    ['add-base', 'add-drawers', 'add-corner', 'add-corner-out', 'remove-cabinet', 'reset-arrangement']
      .forEach(id => expect(byTestId(c, id)).not.toBeNull());

    openMore(c);
    expect(byTestId(c, 'layout-extra')).toBeNull();
    expect(byTestId(c, 'layout-more').getAttribute('aria-expanded')).toBe('false');
  });

  it('switches what the gizmo does between moving and rotating', () => {
    const c = render();
    expect(byTestId(c, 'gizmo-translate').getAttribute('aria-pressed')).toBe('true');
    act(() => byTestId(c, 'gizmo-rotate').click());
    expect(mockStudio.setGizmoMode).toHaveBeenCalledWith('rotate');
  });

  it('merges a run from the row itself', () => {
    const c = render();
    expect(byTestId(c, 'layout-unmerge')).toBeNull();
    act(() => byTestId(c, 'layout-merge').click());
    expect(byTestId(c, 'merge-dialog-stub')).not.toBeNull();
  });

  it('unmerges a run the selection belongs to, without touching the parts', () => {
    mockStudio = studioWith({config: {units: 'mm', custom: true, groups: [['B01', 'B02']], finish: 'oak'}});
    const c = render();
    expect(byTestId(c, 'layout-merge')).toBeNull();
    act(() => byTestId(c, 'layout-unmerge').click());
    expect(mockStudio.update).toHaveBeenCalledWith({groups: []});

    openMore(c);
    expect(byTestId(c, 'layout-group-readout').textContent).toContain('B01 + B02');
  });

  it('can be put away entirely, and comes back from its pill', () => {
    const c = render();
    act(() => byTestId(c, 'layout-dismiss').click());

    // Nothing of the card is left over the model...
    expect(byTestId(c, 'layout-widget')).toBeNull();
    ['layout-bar', 'gizmo-translate', 'layout-merge', 'layout-more', 'done-arranging']
      .forEach(id => expect(byTestId(c, id)).toBeNull());
    // ...but the way back is labelled, and occupies the same corner.
    const collapsed = byTestId(c, 'layout-widget-collapsed');
    expect(collapsed.className).toContain('layout-widget');
    expect(collapsed.className).toContain('is-collapsed');
    expect(byTestId(c, 'layout-expand').textContent).toContain('Layout');

    act(() => byTestId(c, 'layout-expand').click());
    expect(byTestId(c, 'layout-bar')).not.toBeNull();
    expect(byTestId(c, 'layout-widget-collapsed')).toBeNull();
  });

  it('leaves arrange mode alone when it is put away', () => {
    // Dismissing hides the controls; it must not also drop the mode, or the gizmo
    // stays on screen with nothing visible to turn it off from.
    const c = render();
    act(() => byTestId(c, 'layout-dismiss').click());
    expect(mockStudio.setArrange).not.toHaveBeenCalled();
  });

  it('finishes from Done', () => {
    const c = render();
    act(() => byTestId(c, 'done-arranging').click());
    expect(mockStudio.setArrange).toHaveBeenCalledWith(false);
  });
});
