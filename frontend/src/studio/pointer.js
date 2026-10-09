/**
 * Tap-vs-drag discrimination for the 3D viewport.
 *
 * The R3F event layer computes pointer travel but only applies it to
 * `onPointerMissed`; click events on hit objects are delivered whenever the
 * pointer-up happens over an object that the pointer-down hit. On touch that
 * means an orbit/pinch drag which begins on a cabinet selects it on release.
 *
 * `createTapGuard` is a tiny state machine (no DOM, unit-testable) that records
 * the press position and reports whether the release was a tap. `installTapGuard`
 * wires it to the window in the capture phase so it is updated before R3F's own
 * listeners on the canvas run.
 */
export const TAP_SLOP_PX = 8;
export const TAP_MAX_MS = 600;

export function createTapGuard({slop = TAP_SLOP_PX, maxMs = TAP_MAX_MS} = {}) {
  let press = null;
  let tap = true;
  return {
    down(x, y, time) {
      press = {x, y, time};
      tap = false;
    },
    up(x, y, time) {
      if (!press) {
        // No matching press was observed (e.g. the gesture began off-canvas).
        tap = true;
        return;
      }
      const travel = Math.hypot(x - press.x, y - press.y);
      const held = time - press.time;
      tap = travel <= slop && held <= maxMs;
      press = null;
    },
    cancel() {
      press = null;
      tap = false;
    },
    /** True when the last completed gesture was a tap rather than a drag. */
    isTap() {
      return tap;
    },
    reset() {
      press = null;
      tap = true;
    },
  };
}

export const tapGuard = createTapGuard();

/** Guard a click handler in the 3D scene: runs the handler only on a real tap. */
export function onTap(handler) {
  return event => {
    if (!tapGuard.isTap()) return;
    handler(event);
  };
}

/** Wire the shared guard to window pointer events (capture phase). */
export function installTapGuard(target = window, guard = tapGuard) {
  if (!target || !target.addEventListener) return () => {};
  const down = e => guard.down(e.clientX, e.clientY, e.timeStamp || performance.now());
  const up = e => guard.up(e.clientX, e.clientY, e.timeStamp || performance.now());
  const cancel = () => guard.cancel();
  target.addEventListener('pointerdown', down, true);
  target.addEventListener('pointerup', up, true);
  target.addEventListener('pointercancel', cancel, true);
  return () => {
    target.removeEventListener('pointerdown', down, true);
    target.removeEventListener('pointerup', up, true);
    target.removeEventListener('pointercancel', cancel, true);
  };
}
