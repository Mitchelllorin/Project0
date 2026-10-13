/**
 * The feel and the cost of moving the camera.
 *
 * Two things made an orbit drag feel sticky, and both were measured in a real
 * browser rather than guessed at:
 *
 * 1. three re-renders the shadow map on every frame it draws. The shadow pass
 *    was 229 of 524 draw calls on the kitchen — 44% of the frame — and the
 *    render call measured 6.4x more expensive with it than without. Nothing
 *    that casts a shadow can move while the pointer is held down, so during a
 *    drag that entire pass is spent on an image that cannot have changed, at
 *    exactly the moment the frame budget is tightest.
 *
 * 2. OrbitControls' damping applies only `dampingFactor` of the accumulated
 *    pointer delta per frame and then decays the rest, so the camera trails the
 *    pointer by -1/ln(1-damping) rendered frames. At 0.08 that is 12 frames:
 *    about 200ms at 60fps, which reads as the model being on a rubber band
 *    rather than under the cursor.
 *
 * Freezing the shadow map is only safe because it is scoped to the gesture:
 * autoUpdate goes back on the moment the pointer is released, so a scene change
 * that lands mid-drag is at worst one gesture stale and corrects itself on
 * release. Leaving it off globally would need every animating object — the door
 * swing, the explode, a dragged cabinet — to remember to mark the map dirty,
 * and a missed one is a wrong shadow nobody notices until it is on a brochure.
 */

/** drei/three OrbitControls damping. Lag is -1/ln(1-damping) rendered frames. */
export const ORBIT_DAMPING = 0.2;

/** How many rendered frames the camera takes to cover 63% of a pointer move. */
export function dampingLagFrames(damping = ORBIT_DAMPING) {
  return -1 / Math.log(1 - damping);
}

/** Stop re-rendering the shadow map: called when a camera drag starts. */
export function freezeShadows(gl) {
  if (gl && gl.shadowMap) gl.shadowMap.autoUpdate = false;
}

/** Start it again on release, and ask for the frame that catches it up. */
export function resumeShadows(gl, invalidate) {
  if (gl && gl.shadowMap) gl.shadowMap.autoUpdate = true;
  if (typeof invalidate === 'function') invalidate();
}
