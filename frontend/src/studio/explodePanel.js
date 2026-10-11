// Explode panel state.
//
// `ExplodeControls` sits on the bottom edge of the viewport over the exploded
// assembly, and it swallows orbit drags inside its own footprint — so it can be
// dismissed down to a pill and brought back. The pill keeps a working slider, so
// the amount can still be scrubbed with the panel out of the way.
//
// Dismissal is deliberately session-only. The panel belongs to every explode
// assembly, so a viewer who dismissed it while inspecting one run still gets it
// back on the next visit, instead of losing it to a stored preference.
export const EXPLODE_PANEL_OPEN = 'open';
export const EXPLODE_PANEL_MINIMISED = 'minimised';

export function explodePanelState(action, current = EXPLODE_PANEL_OPEN) {
  if (action === 'dismiss') return EXPLODE_PANEL_MINIMISED;
  if (action === 'restore') return EXPLODE_PANEL_OPEN;
  return current;
}
