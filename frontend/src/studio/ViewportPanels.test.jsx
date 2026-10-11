// The panels drawn over the canvas are the thing this view exists to get out of
// the way, so they are driven the way a viewer uses them: dismiss each one,
// expect the model to be clear, bring it back from its pill.
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
  presentation: false, selected: ['B01'], busy: false, explode: 0, arrange: false,
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
