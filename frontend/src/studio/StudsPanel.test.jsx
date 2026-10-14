// The panel that says what is holding each cabinet up.
//
// This is the part of the feature you cannot check by looking at the kitchen: behind a
// finished wall there is either timber where a screw went or there is not, and nothing on
// the surface says which. So the panel is driven here against the studio's own default run —
// the cabinets in `KITCHEN` are what `/api/configure` answers with — and the point of the
// test is that the *list* distinguishes the cabinets that are fine from the ones that are
// not, and that changing the centres changes the answer rather than decorating it.
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {Configurator} from './Controls';

const cabinet = (id, kind, width, x, z, rotation = 0, name = 'Base') =>
  ({id, name, kind, width, depth: 609.6, height: 876.3, position: [x, 0, z], rotation});

const KITCHEN = [
  cabinet('B01', 'drawers', 762, 381, 304.8, 0, 'Drawer base'),
  cabinet('B02', 'base', 914.4, 1219.2, 304.8, 0, 'Sink base'),
  cabinet('B03', 'base', 762, 2057.4, 304.8, 0, 'Double-door base'),
  cabinet('C01', 'corner', 914.4, 2895.6, 457.2, 0, 'Diagonal corner'),
  cabinet('B04', 'base', 762, 3048, 1295.4, -Math.PI / 2, 'Return base'),
  cabinet('B05', 'base', 762, 3048, 2057.4, -Math.PI / 2, 'Return base'),
  cabinet('I01', 'base', 762, 550, 2050, 0, 'Island base'),
  cabinet('I02', 'base', 762, 1312, 2050, 0, 'Island base'),
];

const mockState = {tab: 'studs', config: {layout: 'l-shape', studs: false, stud_spacing: 600}, update: jest.fn(), scene: {cabinets: KITCHEN}};
jest.mock('./StudioContext', () => ({useStudio: () => mockState}));
// The switch is a Radix control; what matters here is the value it is given and the change
// it reports, not the control that reports it.
jest.mock('../components/ui/switch', () => ({
  Switch: ({checked, onCheckedChange, ...rest}) => <button role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} {...rest}/>,
}));

beforeAll(() => {globalThis.IS_REACT_ACT_ENVIRONMENT = true;});
beforeEach(() => {
  mockState.tab = 'studs';
  mockState.config = {layout: 'l-shape', studs: false, stud_spacing: 600};
});

function render(){
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => createRoot(container).render(<Configurator/>));
  return container;
}
const byTestId = (c, id) => c.querySelector(`[data-testid="${id}"]`);
const click = (c, id) => act(() => byTestId(c, id).click());
const choose = (c, id, value) => act(() => {
  const select = byTestId(c, id);
  select.value = String(value);
  select.dispatchEvent(new Event('change', {bubbles: true}));
});

describe('the wall framing panel', () => {
  it('is its own section of the left column, under the rail tab that opens it', () => {
    const c = render();
    expect(byTestId(c, 'configurator-heading').textContent).toBe('Wall & fixing');
  });

  it('turns the framing on from the panel, and says what that does to the wall', () => {
    const c = render();
    const toggle = byTestId(c, 'studs-switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(byTestId(c, 'studs-switch-detail').textContent).toContain('ghost out');
    click(c, 'studs-switch');
    expect(mockState.update).toHaveBeenCalledWith({studs: true});
  });

  it('offers the centres it frames at, and shows them as the choice it is', () => {
    const c = render();
    const select = byTestId(c, 'stud-spacing');
    expect(Array.from(select.options).map(option => option.value)).toEqual(['400', '600']);
    expect(select.value).toBe('600');
    choose(c, 'stud-spacing', 400);
    expect(mockState.update).toHaveBeenCalledWith({stud_spacing: 400});
  });

  // A wall is rarely a whole number of bays. The panel reports the centres that were
  // achieved rather than the ones that were asked for, because they differ, and the
  // difference is what is on the wall.
  it('reports the centres the wall was actually framed at', () => {
    const asked600 = render();
    expect(byTestId(asked600, 'stud-centres').textContent).toContain('572 mm centres');
    mockState.config.stud_spacing = 400;
    const asked400 = render();
    expect(byTestId(asked400, 'stud-centres').textContent).toContain('364 mm centres');
  });

  it('lists every cabinet standing against a wall, and neither island', () => {
    const c = render();
    const list = byTestId(c, 'fixing-list');
    expect(list.querySelectorAll('li')).toHaveLength(6);
    expect(Array.from(list.querySelectorAll('li')).map(row => row.getAttribute('data-testid')))
      .toEqual(['fixing-B01', 'fixing-B02', 'fixing-B03', 'fixing-C01', 'fixing-B04', 'fixing-B05']);
    expect(byTestId(c, 'fixing-I01')).toBeNull();
  });

  it('marks the cabinets that would need a cleat, and says why', () => {
    const c = render();
    expect(byTestId(c, 'fixing-B01').className).toBe('fixing-row studs');
    expect(byTestId(c, 'fixing-B01').textContent).toContain('2 studs behind it, screwed at both ends');
    expect(byTestId(c, 'fixing-B02').className).toBe('fixing-row cleat');
    expect(byTestId(c, 'fixing-B02').textContent).toContain('478 mm from an end. Cleat it.');
    expect(byTestId(c, 'cleat-advice').textContent).toBe('3 of 6 need a cleat or a rated anchor at an end that has no stud behind it.');
  });

  it('counts the timber and the fixings it is reporting on', () => {
    const c = render();
    // 14 studs over the two walls of the L, one screw into every stud a cabinet covers.
    expect(byTestId(c, 'heading-wall-framing').textContent).toContain('14 studs');
    expect(byTestId(c, 'heading-what-is-holding-it').textContent).toContain('9 fixings');
  });

  it('says so rather than guessing when nothing is against a wall', () => {
    mockState.scene = {cabinets: [KITCHEN[6]]};
    const c = render();
    expect(byTestId(c, 'fixing-list')).toBeNull();
    expect(c.textContent).toContain('Nothing is standing against a wall');
    mockState.scene = {cabinets: KITCHEN};
  });
});
