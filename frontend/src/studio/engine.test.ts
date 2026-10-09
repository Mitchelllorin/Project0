import {stageProgress, displacement, explodedPosition, formatDimension, money, type AssemblyPart} from './engine';

const make = (over: Partial<AssemblyPart> = {}): AssemblyPart => ({
  id: 'part', name: 'Part', category: 'panel', position: [0, 0, 0], size: [10, 10, 10],
  rotation: [0, 0, 0], assembly_axis: [1, 0, 0], parent_id: null, assembly_order: 1,
  travel: 100, geometry: 'gable', material: 'plywood', machining: {}, ...over,
});

describe('stageProgress', () => {
  it('is zero at the start of a stage', () => expect(stageProgress(0, 2)).toBe(0));
  it('clamps to 1 at full travel', () => expect(stageProgress(1, 3)).toBeCloseTo(1));
  it('stays within 0..1 for every stage', () => {
    for (const amount of [0, .1, .3, .5, .7, .9, 1]) {
      for (let stage = 0; stage < 4; stage++) {
        const v = stageProgress(amount, stage);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  it('never decreases as the amount grows', () => {
    for (let stage = 0; stage < 4; stage++) {
      let prev = -1;
      for (const a of [0, .2, .4, .6, .8, 1]) {
        const v = stageProgress(a, stage);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
  });
});

describe('displacement', () => {
  it('is zero when the assembly is closed', () => {
    const p = make({assembly_order: 2});
    expect(displacement(p, [p], 0)).toEqual([0, 0, 0]);
  });
  it('moves along the assembly axis by travel', () => {
    const p = make({assembly_axis: [1, 0, 0], travel: 100, assembly_order: 1});
    expect(displacement(p, [p], 1)[0]).toBeCloseTo(100);
  });
  it('inherits the parent displacement', () => {
    const parent = make({id: 'parent', assembly_axis: [1, 0, 0], travel: 100, assembly_order: 1});
    const child = make({id: 'child', parent_id: 'parent', assembly_axis: [0, 1, 0], travel: 50, assembly_order: 1});
    const d = displacement(child, [parent, child], 1);
    expect(d[0]).toBeCloseTo(100);
    expect(d[1]).toBeCloseTo(50);
  });
  it('terminates on deep parent chains', () => {
    const parts: AssemblyPart[] = [];
    for (let i = 0; i < 12; i++) parts.push(make({id: `p${i}`, parent_id: i ? `p${i - 1}` : null}));
    expect(displacement(parts[11], parts, 1).every(Number.isFinite)).toBe(true);
  });
});

describe('explodedPosition', () => {
  it('converts millimetres to metres', () => {
    const p = make({position: [1000, 0, 0], assembly_axis: [1, 0, 0], travel: 100, assembly_order: 1});
    expect(explodedPosition(p, [p], 1)[0]).toBeCloseTo(1.1);
  });
  it('stays at rest when closed', () => {
    const p = make({position: [500, 0, 0]});
    expect(explodedPosition(p, [p], 0)[0]).toBeCloseTo(.5);
  });
});

describe('formatDimension', () => {
  it('formats millimetres with grouping', () => expect(formatDimension(1000, 'mm')).toBe('1,000 mm'));
  it('formats inches', () => expect(formatDimension(25.4, 'in')).toBe('1 in'));
});

describe('money', () => {
  it('formats USD with two decimals', () => expect(money(1234.5, 2)).toBe('$1,234.50'));
  it('formats whole dollars by default', () => expect(money(1234)).toBe('$1,234'));
});
