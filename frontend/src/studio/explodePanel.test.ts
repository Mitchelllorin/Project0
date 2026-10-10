import {EXPLODE_PANEL_MINIMISED,EXPLODE_PANEL_OPEN,explodePanelState} from './explodePanel';

describe('explode panel state', () => {
  it('dismisses when the viewer dismisses it', () => {
    expect(explodePanelState('dismiss', EXPLODE_PANEL_OPEN)).toBe(EXPLODE_PANEL_MINIMISED);
  });

  it('restores from the pill', () => {
    expect(explodePanelState('restore', EXPLODE_PANEL_MINIMISED)).toBe(EXPLODE_PANEL_OPEN);
  });

  it('starts open, so every explode assembly has the controls', () => {
    expect(explodePanelState('restore')).toBe(EXPLODE_PANEL_OPEN);
  });

  it('ignores an unknown action rather than changing what is on screen', () => {
    expect(explodePanelState('nonsense' as never, EXPLODE_PANEL_OPEN)).toBe(EXPLODE_PANEL_OPEN);
    expect(explodePanelState('nonsense' as never, EXPLODE_PANEL_MINIMISED)).toBe(EXPLODE_PANEL_MINIMISED);
  });

  it('stays dismissed when the dismiss action repeats', () => {
    expect(explodePanelState('dismiss', EXPLODE_PANEL_MINIMISED)).toBe(EXPLODE_PANEL_MINIMISED);
  });
});
