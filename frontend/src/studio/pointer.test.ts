import {createTapGuard, TAP_SLOP_PX, TAP_MAX_MS} from './pointer';

describe('tap guard', () => {
  it('treats a still press-and-release as a tap', () => {
    const guard = createTapGuard();
    guard.down(100, 200, 1000);
    guard.up(102, 203, 1080);
    expect(guard.isTap()).toBe(true);
  });

  it('rejects an orbit drag that begins on a cabinet', () => {
    const guard = createTapGuard();
    guard.down(100, 200, 1000);
    guard.up(180, 260, 1400);
    expect(guard.isTap()).toBe(false);
  });

  it('rejects a hold longer than the tap window', () => {
    const guard = createTapGuard();
    guard.down(100, 200, 1000);
    guard.up(100, 200, 1000 + TAP_MAX_MS + 1);
    expect(guard.isTap()).toBe(false);
  });

  it('accepts travel exactly at the slop limit', () => {
    const guard = createTapGuard();
    guard.down(0, 0, 0);
    guard.up(TAP_SLOP_PX, 0, 50);
    expect(guard.isTap()).toBe(true);
  });

  it('rejects travel just past the slop limit', () => {
    const guard = createTapGuard();
    guard.down(0, 0, 0);
    guard.up(TAP_SLOP_PX + 0.5, 0, 50);
    expect(guard.isTap()).toBe(false);
  });

  it('treats a cancelled gesture (scroll/zoom) as not a tap', () => {
    const guard = createTapGuard();
    guard.down(10, 10, 0);
    guard.cancel();
    expect(guard.isTap()).toBe(false);
  });

  it('allows a release with no observed press, so clicks are never swallowed', () => {
    const guard = createTapGuard();
    guard.up(10, 10, 0);
    expect(guard.isTap()).toBe(true);
  });

  it('resets back to a permissive default', () => {
    const guard = createTapGuard();
    guard.down(0, 0, 0);
    guard.up(500, 500, 900);
    expect(guard.isTap()).toBe(false);
    guard.reset();
    expect(guard.isTap()).toBe(true);
  });

  it('classifies consecutive gestures independently', () => {
    const guard = createTapGuard();
    guard.down(0, 0, 0);
    guard.up(200, 0, 100);
    expect(guard.isTap()).toBe(false);
    guard.down(50, 50, 200);
    guard.up(50, 50, 250);
    expect(guard.isTap()).toBe(true);
  });
});
