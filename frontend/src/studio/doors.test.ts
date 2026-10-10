import {doorsOpenFor, pickedAfterToggle} from './doors';

describe('doors open for the selected cabinet', () => {
  it('opens the cabinet the designer picked', () => {
    expect(doorsOpenFor('B02', {picked: true, selected: ['B02']})).toBe(true);
  });

  it('leaves the cabinets they are not looking at shut', () => {
    expect(doorsOpenFor('B01', {picked: true, selected: ['B02']})).toBe(false);
  });

  it('opens a whole merged run, since every member is selected', () => {
    expect(doorsOpenFor('B01', {picked: true, selected: ['B01', 'B02']})).toBe(true);
    expect(doorsOpenFor('B02', {picked: true, selected: ['B01', 'B02']})).toBe(true);
  });

  it('leaves the default selection alone, so the studio opens on a closed kitchen', () => {
    expect(doorsOpenFor('B01', {selected: ['B01']})).toBe(false);
    expect(doorsOpenFor('B01', {picked: false, selected: ['B01']})).toBe(false);
  });

  it('still opens everything from the toolbar toggle', () => {
    expect(doorsOpenFor('B09', {doorsOpen: true})).toBe(true);
    expect(doorsOpenFor('B09', {doorsOpen: true, selected: [], picked: true})).toBe(true);
  });

  it('does not swing doors in the assembly view, where the panels are already apart', () => {
    expect(doorsOpenFor('B01', {assembly: true, picked: true, selected: ['B01']})).toBe(false);
    expect(doorsOpenFor('B01', {assembly: true, doorsOpen: true})).toBe(true);
  });

  it('survives an empty or missing selection', () => {
    expect(doorsOpenFor('B01', {picked: true})).toBe(false);
    expect(doorsOpenFor('B01', {})).toBe(false);
    expect(doorsOpenFor('B01')).toBe(false);
  });

  it('closes the selected cabinet too when the toolbar toggle is switched off', () => {
    const picked = pickedAfterToggle(true, true);
    expect(picked).toBe(false);
    expect(doorsOpenFor('B01', {doorsOpen: false, picked, selected: ['B01']})).toBe(false);
  });

  it('leaves the picked flag alone when the toggle is switched on', () => {
    expect(pickedAfterToggle(false, true)).toBe(true);
    expect(pickedAfterToggle(false, false)).toBe(false);
  });
});
