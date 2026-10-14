// The panels beside the canvas are the thing this view exists to keep out of the way,
// so they are driven the way a viewer uses them: dismiss each one, expect the model to
// be clear, bring it back from its pill. The last block is the one that matters most —
// the canvas box holds the canvas and nothing else, so no control can be drawn on the
// model in the first place.
//
// The canvas is stubbed rather than rendered — jsdom cannot load `three`'s build,
// and none of this needs a scene, only the chrome painted on top of one.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {Viewport} from './Viewport';

const mockStudio = {
  scene: {cabinets: [], dimensions: {footprint_width: 3048, footprint_depth: 609.6, run_length: 3048, height: 876.3}},
  config: {units: 'mm', finish: 'oak', style: 'slab', lighting: 'daylight', layout: 'l-shape',
    dimensions: true, rack: 'none', groups: [], custom: false, quote: {show_prices: true}},
  update: jest.fn(), camera: {view: 'perspective', tick: 0}, setCamera: jest.fn(),
  presentation: false, selected: ['B01'], busy: false, explode: 0, setExplode: jest.fn(), arrange: false,
  doorsOpen: false, toggleDoors: jest.fn(), setArrange: jest.fn(),
  selectCabinet: jest.fn(), setInspected: jest.fn(),
  brand: {name: 'Northline', subtitle: '', accent: '#dca55e', logo_url: ''},
};

jest.mock('./StudioContext', () => ({useStudio: () => mockStudio}));
jest.mock('three', () => ({}));
jest.mock('@react-three/fiber', () => ({Canvas: () => null, useThree: () => ({}), useFrame: () => {}}));
jest.mock('@react-three/drei', () => ({OrbitControls: () => null, Environment: () => null,
  Lightformer: () => null, ContactShadows: () => null, Line: () => null, TransformControls: () => null}));
jest.mock('./Cabinet3D', () => ({Cabinet3D: () => null}));
jest.mock('./Room3D', () => ({Room3D: () => null}));
jest.mock('react-router-dom', () => ({useNavigate: () => jest.fn()}));
jest.mock('./LayoutWidget', () => ({LayoutWidget: () => <div data-testid="layout-widget-stub"/>}));
// Inspector.jsx co-locates the part geometry and the assembly canvas; the explode bar it
// also exports uses neither, and `three` does not load under jsdom.
jest.mock('./PartGeometry', () => ({Panel: () => null, PartMesh: () => null, Part: () => null}));

beforeAll(() => {globalThis.IS_REACT_ACT_ENVIRONMENT = true;});

function render(){
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => createRoot(container).render(<Viewport/>));
  return container;
}

const byTestId = (c, id) => c.querySelector(`[data-testid="${id}"]`);
const click = (c, id) => act(() => byTestId(c, id).click());

// Each floating panel: what it is called, the container it shows in, the control
// that puts it away, and the pill that brings it back.
const PANELS = [
  {name: 'the design caption', open: 'viewport-heading', dismiss: 'heading-dismiss', collapsed: 'viewport-heading-collapsed', expand: 'heading-expand', text: 'Caption'},
  {name: 'the view tools', open: 'viewport-tools', dismiss: 'tools-dismiss', collapsed: 'viewport-tools-collapsed', expand: 'tools-expand', text: 'View tools'},
  {name: 'the camera dock', open: 'camera-toolbar', dismiss: 'dock-dismiss', collapsed: 'camera-toolbar-collapsed', expand: 'dock-expand', text: 'Camera'},
];

describe('the panels over the model', () => {
  it('every one of them opens with a dismiss control, and none is missing one', () => {
    const c = render();
    PANELS.forEach(panel => {
      expect(byTestId(c, panel.open)).not.toBeNull();
      expect(byTestId(c, panel.dismiss)).not.toBeNull();
      expect(byTestId(c, panel.collapsed)).toBeNull();
    });
  });

  it('says what each dismiss does, for anyone who cannot see the icon', () => {
    const c = render();
    expect(byTestId(c, 'heading-dismiss').getAttribute('aria-label')).toBe('Hide the design caption');
    expect(byTestId(c, 'tools-dismiss').getAttribute('aria-label')).toBe('Hide the view tools');
    expect(byTestId(c, 'dock-dismiss').getAttribute('aria-label')).toBe('Hide the camera dock');
  });

  it.each(PANELS)('puts $name away and leaves a labelled way back', panel => {
    const c = render();
    click(c, panel.dismiss);
    expect(byTestId(c, panel.open)).toBeNull();
    expect(byTestId(c, panel.dismiss)).toBeNull();

    expect(byTestId(c, panel.collapsed)).not.toBeNull();
    expect(byTestId(c, panel.expand).textContent).toContain(panel.text);
    expect(byTestId(c, panel.expand).getAttribute('aria-label')).toBe(`Show ${panel.name}`);

    click(c, panel.expand);
    expect(byTestId(c, panel.open)).not.toBeNull();
    expect(byTestId(c, panel.collapsed)).toBeNull();
  });

  it('clears the viewport when every panel is put away, with a way back to each', () => {
    const c = render();
    PANELS.forEach(panel => click(c, panel.dismiss));
    PANELS.forEach(panel => {
      expect(byTestId(c, panel.open)).toBeNull();
      expect(byTestId(c, panel.expand)).not.toBeNull();
    });
  });
});

// Nothing a viewer can press is inside the canvas box. That is the whole rule, and it is
// a property of where the elements are rather than of where they are drawn, which is what
// makes it hold at every window size instead of at the one it was measured at.
describe('the canvas box', () => {
  it('holds the canvas and nothing else — no button, no panel, no readout', () => {
    const c = render();
    const box = byTestId(c, 'kitchen-viewport');
    expect(box).not.toBeNull();
    expect(box.querySelector('button')).toBeNull();
    ['viewport-heading', 'viewport-tools', 'camera-toolbar', 'model-controls', 'viewport-layout',
      'viewport-brand', 'viewport-lane-top', 'viewport-lane-bottom'].forEach(id => {
      expect(box.querySelector(`[data-testid="${id}"]`)).toBeNull();
    });
  });

  it('sits between the two lanes that do hold them', () => {
    const c = render();
    const top = byTestId(c, 'viewport-lane-top');
    const bottom = byTestId(c, 'viewport-lane-bottom');
    expect(top).not.toBeNull();
    expect(bottom).not.toBeNull();

    expect(top.contains(byTestId(c, 'viewport-heading'))).toBe(true);
    expect(top.contains(byTestId(c, 'viewport-tools'))).toBe(true);
    expect(bottom.contains(byTestId(c, 'camera-toolbar'))).toBe(true);
    expect(bottom.contains(byTestId(c, 'viewport-layout'))).toBe(true);
    expect(bottom.contains(byTestId(c, 'viewport-brand'))).toBe(true);
    // The model controls are in the lane under the canvas, next to the readouts.
    expect(bottom.contains(byTestId(c, 'model-controls'))).toBe(true);
  });

  it('moves a panel into its lane, keeping it, when it is put away', () => {
    // Dismissing a panel leaves its pill in the same lane, so putting the chrome away can
    // never empty a lane onto the canvas.
    const c = render();
    click(c, 'heading-dismiss');
    const top = byTestId(c, 'viewport-lane-top');
    expect(top.contains(byTestId(c, 'viewport-heading-collapsed'))).toBe(true);
    expect(byTestId(c, 'kitchen-viewport').querySelector('button')).toBeNull();
  });
});

// Seeing what holds a cabinet up is a view of the kitchen, not a page of its own, so the
// toggle that turns the framing on is in the view tools with the doors and the lighting.
// No configuration of the scene is asserted here: the geometry behind it is the subject of
// studs.test.js, and this is only about the control being where a viewer can find it.
describe('the studs toggle', () => {
  it('turns the framing on, and says whether it is on', () => {
    const c = render();
    const toggle = byTestId(c, 'studs-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show the wall studs');
    click(c, 'studs-toggle');
    expect(mockStudio.update).toHaveBeenCalledWith({studs: true});
  });

  it('reads as on, and offers to hide them again, once they are shown', () => {
    mockStudio.config.studs = true;
    const c = render();
    expect(byTestId(c, 'studs-toggle').getAttribute('aria-pressed')).toBe('true');
    expect(byTestId(c, 'studs-toggle').getAttribute('aria-label')).toBe('Hide the wall studs');
    expect(byTestId(c, 'studs-toggle').textContent).toContain('Studs on');
    click(c, 'studs-toggle');
    expect(mockStudio.update).toHaveBeenCalledWith({studs: false});
    mockStudio.config.studs = false;
  });

  it('is in a lane beside the model, not on it', () => {
    const c = render();
    expect(byTestId(c, 'viewport-lane-top').contains(byTestId(c, 'studs-toggle'))).toBe(true);
    expect(byTestId(c, 'kitchen-viewport').querySelector('button')).toBeNull();
  });
});

// The workspace is the one place the kitchen is worked on, so the two controls that
// change it — how it is laid out, and how far a cabinet comes apart — are in the same
// lane of it rather than one here and one on a page of its own.
describe('the controls in the workspace corner', () => {
  afterEach(() => {
    mockStudio.arrange = false;
    mockStudio.scene.cabinets = [];
  });

  it('offers the explode over the workspace itself, not only in the assembly explorer', () => {
    const c = render();
    expect(byTestId(c, 'explode-controls')).not.toBeNull();
    expect(byTestId(c, 'explode-slider')).not.toBeNull();
    // ...and the layout card is not summoned until the kitchen is being laid out.
    expect(byTestId(c, 'layout-widget-stub')).toBeNull();
  });

  it('stacks the layout card and the explode bar in one column, so neither can cover the other', () => {
    mockStudio.arrange = true;
    const c = render();
    const column = byTestId(c, 'model-controls');
    expect(column).not.toBeNull();
    expect(column.contains(byTestId(c, 'layout-widget-stub'))).toBe(true);
    expect(column.contains(byTestId(c, 'explode-controls'))).toBe(true);
  });

  it('names the cabinet the explode takes apart, and does it where the run is visible', () => {
    mockStudio.scene.cabinets = [{id: 'B01', name: 'Base 30', kind: 'base', width: 762, depth: 609.6, height: 876.3, position: [0, 0, 304.8], rotation: 0}];
    const c = render();
    expect(byTestId(c, 'explode-title').textContent).toContain('Explode B01 in place');
  });

  // The size of the thing in hand, read next to the size of the whole run and at the model
  // rather than in a column of type — you are deciding it against the cabinets beside it.
  it('reads the selected cabinet\u2019s own size at the model', () => {
    mockStudio.scene.cabinets = [{id: 'B01', name: 'Base 30', kind: 'base', width: 762, depth: 609.6, height: 876.3, position: [0, 0, 304.8], rotation: 0}];
    const c = render();
    expect(byTestId(c, 'scene-selection-dimension').textContent).toBe(' · B01 762 mm');
    expect(byTestId(c, 'viewport-layout').contains(byTestId(c, 'scene-selection-dimension'))).toBe(true);
    // Beside the figure for the run as a whole, in the same corner readout.
    expect(byTestId(c, 'scene-width-dimension').textContent).toBe(' · 3,048 mm');
  });
});
