import {
  GIZMO_MODES, ROTATION_SNAP_RAD, TRANSLATION_SNAP_M, WIDTH_OPTIONS,
  groupFor, nextGizmoMode, placementReadout, rotationDegrees, runLength, snapLabel,
} from './layoutWidget';

describe('layout widget rules', () => {
  it('snaps to one inch of travel and a 15 degree detent', () => {
    expect(TRANSLATION_SNAP_M).toBeCloseTo(0.0254, 6);
    expect(ROTATION_SNAP_RAD).toBeCloseTo(Math.PI / 12, 6);
    expect(ROTATION_SNAP_RAD * 180 / Math.PI).toBeCloseTo(15, 6);
  });

  it('offers both gizmo modes, named the way a designer reads them', () => {
    expect(GIZMO_MODES.map(mode => mode.id)).toEqual(['translate', 'rotate']);
    expect(GIZMO_MODES.every(mode => mode.hint.length > 0)).toBe(true);
  });

  it('flips between the two gizmo modes', () => {
    expect(nextGizmoMode('translate')).toBe('rotate');
    expect(nextGizmoMode('rotate')).toBe('translate');
    expect(nextGizmoMode('nonsense')).toBe('rotate');
  });

  it('finds the merged run a cabinet belongs to', () => {
    const groups = [['B01', 'B02'], ['B05', 'B06']];
    expect(groupFor(groups, 'B02')).toEqual(['B01', 'B02']);
    expect(groupFor(groups, 'B09')).toBeNull();
    expect(groupFor(undefined, 'B01')).toBeNull();
    expect(groupFor(groups, undefined)).toBeNull();
  });

  it('reports rotation as a friendly 0-359 degree heading', () => {
    expect(rotationDegrees(0)).toBe(0);
    expect(rotationDegrees(Math.PI / 2)).toBe(90);
    expect(rotationDegrees(-Math.PI / 2)).toBe(270);
    expect(rotationDegrees(2 * Math.PI)).toBe(0);
    expect(rotationDegrees(undefined)).toBe(0);
  });

  it('labels the snap step in the units the studio is showing', () => {
    expect(snapLabel('mm')).toBe('25.4 mm / 15°');
    expect(snapLabel('in')).toBe('1 in / 15°');
    expect(snapLabel(undefined)).toBe('25.4 mm / 15°');
  });

  it('runs stock widths from 18 in to 48 in in 3 in steps', () => {
    expect(WIDTH_OPTIONS).toHaveLength(11);
    expect(WIDTH_OPTIONS[0]).toEqual({mm: 457.2, label: '18 in / 457 mm'});
    expect(WIDTH_OPTIONS[10]).toEqual({mm: 1219.2, label: '48 in / 1219 mm'});
  });

  it('adds up a merged run', () => {
    expect(runLength([{width: 762}, {width: 914.4}])).toBeCloseTo(1676.4, 3);
    expect(runLength([])).toBe(0);
    expect(runLength(undefined)).toBe(0);
  });

  it('reads out the position and rotation of the cabinet the gizmo is moving', () => {
    const readout = placementReadout({id: 'B02', position: [762, 0, 304.8], rotation: Math.PI / 2}, 'mm');
    expect(readout).toEqual({id: 'B02', position: '762 mm · 305 mm', rotation: '90°'});
    expect(placementReadout(null, 'mm')).toBeNull();
    expect(placementReadout(undefined, 'in')).toBeNull();
  });
});
