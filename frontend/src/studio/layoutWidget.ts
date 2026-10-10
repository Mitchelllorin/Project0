// Pure rules for the free-layout widget. Kept out of the React component so the
// snap steps, grouping and readouts can be unit-tested without a canvas.
import {formatDimension} from './engine';

// The grid a cabinet maker actually quotes to: one inch of travel and a 15°
// detent. The gizmo snaps to these, so a dragged cabinet always lands on a real
// size instead of an arbitrary float.
export const TRANSLATION_SNAP_M = 0.0254;
export const ROTATION_SNAP_RAD = Math.PI / 12;

export const GIZMO_MODES = [
  {id: 'translate', label: 'Move', hint: 'Drag the coloured arrows to slide the cabinet'},
  {id: 'rotate', label: 'Rotate', hint: 'Drag the coloured rings to turn the cabinet'},
];

// 18 in (457 mm) to 48 in (1219 mm) in 3 in steps — the stock carcass widths.
export const WIDTH_OPTIONS = Array.from({length: 11}, (_, i) => ({
  mm: Number(((i + 6) * 76.2).toFixed(1)),
  label: `${(i + 6) * 3} in / ${Math.round((i + 6) * 76.2)} mm`,
}));

export function nextGizmoMode(mode: string): string {
  return mode === 'rotate' ? 'translate' : 'rotate';
}

// A merged run is stored as a list of cabinet ids; the widget needs the group a
// selection belongs to so it can offer "unmerge" instead of "merge".
export function groupFor(groups: string[][] | undefined, id: string | undefined): string[] | null {
  if (!id) return null;
  return (groups || []).find(group => group.includes(id)) || null;
}

export function rotationDegrees(radians: number | undefined): number {
  const degrees = Math.round((((radians || 0) * 180) / Math.PI)) % 360;
  return degrees < 0 ? degrees + 360 : degrees;
}

export function snapLabel(units: string | undefined): string {
  return `${units === 'in' ? '1 in' : '25.4 mm'} / 15°`;
}

export function runLength(cabinets: Array<{width?: number}> | undefined): number {
  return (cabinets || []).reduce((total, cabinet) => total + (cabinet.width || 0), 0);
}

// The widget names the cabinet the gizmo is driving, plus where it sits and how
// far it is turned, so the layout can be read without hunting for the arrows.
export function placementReadout(
  cabinet: {id: string; position?: number[]; rotation?: number} | null | undefined,
  units: string,
): {id: string; position: string; rotation: string} | null {
  if (!cabinet) return null;
  const [x, , z] = cabinet.position || [0, 0, 0];
  return {
    id: cabinet.id,
    position: `${formatDimension(x, units)} · ${formatDimension(z, units)}`,
    rotation: `${rotationDegrees(cabinet.rotation)}°`,
  };
}
