// Pure rules for the free-layout widget. Kept out of the React component so the
// snap steps, grouping and readouts can be unit-tested without a canvas.
import {formatDimension} from './engine';

// The grid a cabinet maker actually quotes to: one inch of travel and a 15°
// detent. The gizmo snaps to these, so a dragged cabinet always lands on a real
// size instead of an arbitrary float.
export const TRANSLATION_SNAP_M = 0.0254;
export const ROTATION_SNAP_RAD = Math.PI / 12;

// The range a stock carcass is built in, and the step a stretch lands on: one
// inch, the same grid the gizmo translates on. A cabinet maker quotes whole
// inches, so a drag has to finish on one instead of leaving a 743 mm door.
export const SIZE_MIN_MM = 304.8;
export const SIZE_MAX_MM = 1524;
export const SIZE_SNAP_MM = 25.4;

// A diagonal corner's width is the length of its face, not a run of cabinet, so
// pulling it is a different job. Everything else stretches.
export function stretchable(kind: string | undefined): boolean {
  return kind !== 'corner';
}

/**
 * Where a cabinet ends up when one of its ends is pulled.
 *
 * `localX` is the pointer measured in the cabinet's own frame, `side` is the end
 * being dragged (+1 for the right of the carcass, -1 for the left). The opposite
 * end does not move — that is the whole point of stretching rather than resizing:
 * a run that grows must not shove the cabinet standing next to it.
 *
 * `shift` is how far the centre has to move along the cabinet's local X for the
 * far end to stay put.
 */
export function stretchedWidth(
  {width, localX, side}: {width: number; localX: number; side: number},
): {width: number; shift: number} {
  const raw = side * localX + width / 2;
  const snapped = Math.round(raw / SIZE_SNAP_MM) * SIZE_SNAP_MM;
  const next = Math.max(SIZE_MIN_MM, Math.min(SIZE_MAX_MM, snapped));
  return {width: next, shift: (side * (next - width)) / 2};
}

// What a cabinet *is*. The engine re-cuts every one of these from the catalog, so
// changing this on a placed cabinet rebuilds its panels, its hardware and its price
// without touching where it stands.
export const CABINET_KINDS = [
  {id: 'base', label: 'Doors', hint: 'A double-door base unit'},
  {id: 'drawers', label: 'Drawers', hint: 'A three-drawer base unit'},
  {id: 'corner-out', label: 'Outside corner', hint: 'A base unit with a return panel'},
  {id: 'corner', label: 'Inside corner', hint: 'A diagonal corner carcass'},
];

// A diagonal corner's width is the length of its face, so that is the size a morph
// brings with it (the same 36 in a new corner is added at).
export const CORNER_FACE_MM = 914.4;

/**
 * One cabinet turned into another, standing exactly where it was.
 *
 * Everything about the placement survives except the kind — and, going into a
 * diagonal corner, the width, because a corner's width is a face length and not a run
 * of cabinet. Reinterpreting a 762 mm run as a 762 mm diagonal would quietly build a
 * different unit than the one on screen. Coming *out* of a corner the width is left
 * alone: 914 mm is a perfectly good run.
 */
export function morphPlacement<T extends {kind?: string; width?: number}>(
  placement: T,
  kind: string,
): T {
  if (placement.kind === kind) return placement;
  return {...placement, kind, width: kind === 'corner' ? CORNER_FACE_MM : placement.width};
}

/** Any size the catalog will build, in millimetres, from whatever was typed. */
export function clampSize(millimetres: number): number {
  if (!Number.isFinite(millimetres)) return SIZE_MIN_MM;
  return Math.max(SIZE_MIN_MM, Math.min(SIZE_MAX_MM, millimetres));
}

export const GIZMO_MODES = [
  {id: 'translate', label: 'Move', hint: 'Drag the coloured arrows to slide the cabinet'},
  {id: 'rotate', label: 'Rotate', hint: 'Drag the coloured rings to turn the cabinet'},
];

// 18 in (457 mm) to 48 in (1219 mm) in 3 in steps — the stock carcass widths.
export const WIDTH_OPTIONS = Array.from({length: 11}, (_, i) => ({
  mm: Number(((i + 6) * 76.2).toFixed(1)),
  label: `${(i + 6) * 3} in / ${Math.round((i + 6) * 76.2)} mm`,
}));

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
