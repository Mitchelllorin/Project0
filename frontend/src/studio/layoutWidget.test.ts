import {
  CABINET_KINDS, CORNER_FACE_MM, GIZMO_MODES, ROTATION_SNAP_RAD, SIZE_MAX_MM, SIZE_MIN_MM,
  SIZE_SNAP_MM, TRANSLATION_SNAP_M, WIDTH_OPTIONS,
  clampSize, groupFor, morphPlacement, placementReadout, rotationDegrees, snapLabel,
  stretchable, stretchedWidth,
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

  it('reads out the position and rotation of the cabinet the gizmo is moving', () => {
    const readout = placementReadout({id: 'B02', position: [762, 0, 304.8], rotation: Math.PI / 2}, 'mm');
    expect(readout).toEqual({id: 'B02', position: '762 mm · 305 mm', rotation: '90°'});
    expect(placementReadout(null, 'mm')).toBeNull();
    expect(placementReadout(undefined, 'in')).toBeNull();
  });
});

// Pulling the end of a cabinet is the one layout move that is quicker to do than
// to describe, so the arithmetic behind it is pinned here rather than tuned by eye.
describe('stretching a cabinet by its end', () => {
  it('snaps to the inch a cabinet maker quotes in', () => {
    expect(SIZE_SNAP_MM).toBe(25.4);
    expect(SIZE_MIN_MM).toBe(304.8);
    expect(SIZE_MAX_MM).toBe(1524);
    const pulled = stretchedWidth({width: 762, localX: 400.7, side: 1});
    expect(pulled.width % SIZE_SNAP_MM).toBeCloseTo(0, 6);
  });

  it('leaves the far end exactly where it was when pulled from the right', () => {
    // 635 mm from the centre is 1016 mm of carcass: 40 in, the stock size.
    const {width, shift} = stretchedWidth({width: 762, localX: 635, side: 1});
    expect(width).toBe(1016);
    // far end before: -381, after: centre + shift - width/2
    expect(shift - width / 2).toBeCloseTo(-762 / 2, 6);
    expect(shift).toBeCloseTo((width - 762) / 2, 6);
  });

  it('leaves the far end exactly where it was when pulled from the left', () => {
    const {width, shift} = stretchedWidth({width: 762, localX: -635, side: -1});
    expect(width).toBe(1016);
    expect(shift).toBeCloseTo(-(width - 762) / 2, 6);
  });

  it('mirrors: pulling either end to the same distance gives the same width', () => {
    const right = stretchedWidth({width: 762, localX: 510, side: 1});
    const left = stretchedWidth({width: 762, localX: -510, side: -1});
    expect(right.width).toBe(left.width);
    expect(right.shift).toBeCloseTo(-left.shift, 6);
  });

  it('never pulls a carcass below the smallest it is built in', () => {
    const tiny = stretchedWidth({width: 762, localX: -900, side: 1});
    expect(tiny.width).toBe(SIZE_MIN_MM);
    expect(tiny.shift).toBeCloseTo((SIZE_MIN_MM - 762) / 2, 6);
  });

  it('never pulls a carcass past the widest it is built in', () => {
    const huge = stretchedWidth({width: 762, localX: 99999, side: 1});
    expect(huge.width).toBe(SIZE_MAX_MM);
  });

  it('a drag that has not moved the end changes nothing', () => {
    const still = stretchedWidth({width: 762, localX: 381, side: 1});
    expect(still.width).toBe(762);
    expect(still.shift).toBe(0);
  });

  it('leaves a diagonal corner alone, because its width is a face not a run', () => {
    expect(stretchable('base')).toBe(true);
    expect(stretchable('drawers')).toBe(true);
    expect(stretchable('corner-out')).toBe(true);
    expect(stretchable('corner')).toBe(false);
  });
});

// Turning a placed cabinet into a different cabinet is the whole promise of a custom
// layout, so what survives a morph and what does not is pinned here.
describe('morphing one cabinet into another', () => {
  const unit = {id: 'N01', kind: 'base', width: 762, x: 1200, z: 304.8, rotation: 1.5708};

  it('offers every kind the catalog will build', () => {
    expect(CABINET_KINDS.map(k => k.id)).toEqual(['base', 'drawers', 'corner-out', 'corner']);
    expect(CABINET_KINDS.every(k => k.label && k.hint)).toBe(true);
  });

  it('leaves the cabinet standing exactly where it was', () => {
    const morphed = morphPlacement(unit, 'drawers');
    expect(morphed).toMatchObject({id: 'N01', x: 1200, z: 304.8, rotation: 1.5708, kind: 'drawers'});
  });

  it('carries a run width across, because 900 mm of run is 900 mm of run', () => {
    expect(morphPlacement({...unit, width: 1016}, 'drawers').width).toBe(1016);
    expect(morphPlacement({...unit, width: 1016}, 'corner-out').width).toBe(1016);
  });

  it('brings a face length into a diagonal corner rather than reinterpreting the run', () => {
    expect(morphPlacement({...unit, width: 457.2}, 'corner').width).toBe(CORNER_FACE_MM);
  });

  it('leaves the width alone coming back out of a corner', () => {
    const corner = {id: 'N02', kind: 'corner', width: CORNER_FACE_MM, x: 0, z: 0, rotation: 0};
    expect(morphPlacement(corner, 'base').width).toBe(CORNER_FACE_MM);
  });

  it('is a no-op when it is already that cabinet', () => {
    const same = morphPlacement(unit, 'base');
    expect(same).toBe(unit);
  });

  it('accepts any size the catalog builds, and refuses the rest', () => {
    expect(clampSize(800)).toBe(800);
    expect(clampSize(10)).toBe(SIZE_MIN_MM);
    expect(clampSize(9999)).toBe(SIZE_MAX_MM);
    expect(clampSize(Number.NaN)).toBe(SIZE_MIN_MM);
  });
});
