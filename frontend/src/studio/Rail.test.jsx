// The panels this studio shows are the thing it keeps having to get out of the
// way, so where the *switches* live is a design decision, not an implementation
// detail. They were floating over the canvas — a control parked on top of the
// model it exists to reveal — and they are on the rail now.
//
// That is what this drives: the switches are found on the rail, named for the
// panel they open, and they toggle. jsdom has no layout, so the assertion that
// nothing *floats* over the model is made structurally: the rail holds them and
// the viewport is not part of this component at all.
//
// Everything the rail does not need is stubbed, the way ViewportPanels.test.jsx
// stubs the canvas — Studio.jsx co-locates the whole studio, and none of it is
// reachable from a chrome strip.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {Rail} from './Studio';

const mockSetMobilePanel = jest.fn();
const mockSetTab = jest.fn();
const mockState = {mobilePanel: null};
const mockLocation = {pathname: '/'};

jest.mock('./StudioContext', () => ({
  useStudio: () => ({tab: 'cabinets', setTab: mockSetTab, setMobilePanel: mockSetMobilePanel,
    mobilePanel: mockState.mobilePanel, reset: jest.fn()}),
}));
jest.mock('react-router-dom', () => ({
  NavLink: ({children, ...rest}) => <a {...rest}>{children}</a>,
  useLocation: () => mockLocation,
  useNavigate: () => jest.fn(),
}));
jest.mock('./Viewport', () => ({Viewport: () => null}));
jest.mock('./Controls', () => ({Configurator: () => null}));
jest.mock('./Inspector', () => ({Inspector: () => null, AssemblyTree: () => null, ExplodeControls: () => null}));
jest.mock('./QuotePage', () => () => null);
jest.mock('./BrandPage', () => () => null);
jest.mock('./DealerPanel', () => ({DealerBadge: () => null}));
jest.mock('../components/ui/dialog', () => ({
  Dialog: ({open, children}) => (open ? <>{children}</> : null),
  DialogContent: ({children}) => <div>{children}</div>,
  DialogTitle: ({children}) => <div>{children}</div>,
  DialogDescription: ({children}) => <div>{children}</div>,
}));
jest.mock('../components/ui/button', () => ({Button: ({children, ...rest}) => <button {...rest}>{children}</button>}));

beforeAll(() => {globalThis.IS_REACT_ACT_ENVIRONMENT = true;});

function render(){
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => createRoot(container).render(<Rail/>));
  return container;
}
const byTestId = (c, id) => c.querySelector(`[data-testid="${id}"]`);
const click = (c, id) => act(() => byTestId(c, id).click());

beforeEach(() => {mockSetMobilePanel.mockClear(); mockState.mobilePanel = null; mockLocation.pathname = '/';});

describe('the panel switches', () => {
  it('sit on the rail, not over the model', () => {
    const c = render();
    const rail = byTestId(c, 'tool-rail');
    expect(rail.querySelector('[data-testid="rail-parts-switch"]')).not.toBeNull();
    expect(rail.querySelector('[data-testid="rail-inspect-switch"]')).not.toBeNull();
    // The floating control block is gone, so nothing is left to land on the model.
    expect(c.querySelector('.mobile-panel-buttons')).toBeNull();
  });

  it('wraps the switches and their divider, so hiding them cannot orphan a line', () => {
    // Above 1000px both switches are hidden. The divider has to go with them, or
    // desktop keeps a stray 24px rule above Reset that separates nothing.
    const c = render();
    const group = byTestId(c, 'tool-rail').querySelector('.rail-switch-group');
    expect(group).not.toBeNull();
    expect(group.querySelector('.rail-divider')).not.toBeNull();
    expect(group.contains(byTestId(c, 'rail-parts-switch'))).toBe(true);
    expect(group.contains(byTestId(c, 'rail-inspect-switch'))).toBe(true);
  });

  it('names the panel it opens, and says whether that panel is open', () => {
    const c = render();
    expect(byTestId(c, 'rail-parts-switch').getAttribute('aria-label')).toBe('Toggle the design palette');
    expect(byTestId(c, 'rail-inspect-switch').getAttribute('aria-label')).toBe('Toggle the inspector');
    expect(byTestId(c, 'rail-parts-switch').getAttribute('aria-pressed')).toBe('false');
    expect(byTestId(c, 'rail-inspect-switch').getAttribute('aria-pressed')).toBe('false');
  });

  it('names the panel it actually opens, which is the parts list on the assembly page', () => {
    mockLocation.pathname = '/assembly';
    const c = render();
    expect(byTestId(c, 'rail-parts-switch').getAttribute('aria-label')).toBe('Toggle the parts list');
  });

  it('opens the panel it names', () => {
    const c = render();
    click(c, 'rail-parts-switch');
    expect(mockSetMobilePanel).toHaveBeenCalledWith('config');
    click(c, 'rail-inspect-switch');
    expect(mockSetMobilePanel).toHaveBeenCalledWith('inspector');
  });

  it('closes a panel that is already open, so the switch is a toggle rather than one-way', () => {
    mockState.mobilePanel = 'config';
    const c = render();
    expect(byTestId(c, 'rail-parts-switch').getAttribute('aria-pressed')).toBe('true');
    click(c, 'rail-parts-switch');
    expect(mockSetMobilePanel).toHaveBeenCalledWith(null);
  });
});
