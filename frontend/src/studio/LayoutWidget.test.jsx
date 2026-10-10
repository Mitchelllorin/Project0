// The widget is the whole free-layout workflow, so the test drives the things
// that make it self-sufficient rather than asserting the markup: merging a run
// from inside the widget, unmerging it again, and switching what the gizmo does.
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

describe('LayoutWidget', () => {
  it('names the cabinet the gizmo drives, where it sits and how far it is turned', () => {
    const c = render();
    expect(byTestId(c, 'layout-widget')).not.toBeNull();
    expect(byTestId(c, 'layout-cabinet-select')).not.toBeNull();
    expect(byTestId(c, 'layout-position').textContent).toBe('0 mm · 305 mm');
    expect(byTestId(c, 'layout-rotation').textContent).toBe('0°');
    expect(byTestId(c, 'layout-placement-readout').textContent).toContain('Position X · Z');
    expect(byTestId(c, 'layout-widget').textContent).toContain('Snaps to 25.4 mm / 15°');
  });

  it('switches what the gizmo does between moving and rotating', () => {
    const c = render();
    expect(byTestId(c, 'gizmo-translate').getAttribute('aria-pressed')).toBe('true');
    act(() => byTestId(c, 'gizmo-rotate').click());
    expect(mockStudio.setGizmoMode).toHaveBeenCalledWith('rotate');
  });

  it('offers every stock carcass width to the selected cabinet', () => {
    const c = render();
    expect(byTestId(c, 'cabinet-width').querySelectorAll('option')).toHaveLength(11);
    expect(byTestId(c, 'add-corner-out')).not.toBeNull();
    expect(byTestId(c, 'remove-cabinet')).not.toBeNull();
  });

  it('merges a run from inside the widget', () => {
    const c = render();
    expect(byTestId(c, 'layout-unmerge')).toBeNull();
    act(() => byTestId(c, 'layout-merge').click());
    expect(byTestId(c, 'merge-dialog-stub')).not.toBeNull();
  });

  it('unmerges a run the selection belongs to, without touching the parts', () => {
    mockStudio = studioWith({config: {units: 'mm', custom: true, groups: [['B01', 'B02']], finish: 'oak'}});
    const c = render();
    expect(byTestId(c, 'layout-merge')).toBeNull();
    expect(byTestId(c, 'layout-group-readout').textContent).toBe('B01 + B02');
    act(() => byTestId(c, 'layout-unmerge').click());
    expect(mockStudio.update).toHaveBeenCalledWith({groups: []});
  });

  it('closes from both the dismiss control and Done', () => {
    const c = render();
    act(() => byTestId(c, 'layout-dismiss').click());
    expect(mockStudio.setArrange).toHaveBeenCalledWith(false);
    act(() => byTestId(c, 'done-arranging').click());
    expect(mockStudio.setArrange).toHaveBeenCalledTimes(2);
  });
});
