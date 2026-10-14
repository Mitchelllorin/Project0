// The explode means two different things in the two views, and the difference is
// what the workspace version is for: there, everything around the selected
// cabinet stays where it is, so the size you are choosing can be seen against
// the run it has to live in. Exploding the whole kitchen in the workspace would
// take away the very thing the question is asked against; exploding only one
// cabinet in the explorer would take away the run it is a part of.
import {explodeAmount, explodeScope} from './explodeScope';

const CABINETS = [{id: 'B01'}, {id: 'B02'}, {id: 'B03'}];

describe('which cabinets the explode takes apart', () => {
  it('is everything in the assembly explorer, whose whole view is the selection', () => {
    expect(explodeScope({cabinets: CABINETS, selected: ['B01', 'B02'], assembly: true}))
      .toEqual(CABINETS);
  });

  it('is only the cabinets in focus in the workspace, so the run around them stays', () => {
    expect(explodeScope({cabinets: CABINETS, selected: ['B02'], assembly: false}))
      .toEqual([{id: 'B02'}]);
  });

  it('is nothing to explode when nothing is selected in the workspace', () => {
    expect(explodeScope({cabinets: CABINETS, selected: [], assembly: false})).toEqual([]);
  });
});

describe('how far a cabinet comes apart', () => {
  it('follows the slider for a cabinet in focus', () => {
    expect(explodeAmount('B02', {selected: ['B02'], assembly: false, explode: 0.65})).toBe(0.65);
  });

  it('leaves its neighbours alone, wherever the slider is', () => {
    expect(explodeAmount('B03', {selected: ['B02'], assembly: false, explode: 0.65})).toBe(0);
  });

  it('takes every cabinet the explorer is showing, selected or not', () => {
    expect(explodeAmount('B03', {selected: ['B02'], assembly: true, explode: 0.34})).toBe(0.34);
  });

  it('is nothing at all when the slider is at rest', () => {
    expect(explodeAmount('B01', {selected: ['B01'], assembly: true, explode: 0})).toBe(0);
  });
});
