// Moving the camera is the studio's most repeated gesture, so the two numbers
// that decide how it feels are pinned here rather than tuned by eye later.
//
// jsdom renders no WebGL, so this tests the decisions rather than a picture:
// the arithmetic three's damping does, and the fact that the viewport is wired
// to the shadow freeze at all. Both were measured in a real browser first —
// 524 draw calls per frame with the shadow pass against 295 without it, and a
// render call 6.4x more expensive — which is why the wiring is asserted and
// not left to whichever prop someone edits next.
import fs from 'fs';
import path from 'path';
import {ORBIT_DAMPING, dampingLagFrames, freezeShadows, resumeShadows} from './interaction';

const source = fs.readFileSync(path.join(__dirname, 'Viewport.jsx'), 'utf8');

describe('how the camera answers the pointer', () => {
  test('the camera trails the pointer by a few frames, not a fifth of a second', () => {
    // Where this started: 0.08 damping is a 12-frame low-pass, ~200ms at 60fps.
    expect(dampingLagFrames(0.08)).toBeGreaterThan(11);
    expect(dampingLagFrames(ORBIT_DAMPING)).toBeLessThan(6);
  });

  test('damping stays inside the range three documents, and beats no damping', () => {
    expect(ORBIT_DAMPING).toBeGreaterThan(0);
    expect(ORBIT_DAMPING).toBeLessThan(1);
    // Not so stiff that the smoothing the option exists for is gone.
    expect(dampingLagFrames(ORBIT_DAMPING)).toBeGreaterThan(1);
  });
});

describe('the shadow map during a drag', () => {
  test('the drag turns it off and the release turns it back on', () => {
    const gl = {shadowMap: {autoUpdate: true}};
    freezeShadows(gl);
    expect(gl.shadowMap.autoUpdate).toBe(false);
    resumeShadows(gl);
    expect(gl.shadowMap.autoUpdate).toBe(true);
  });

  test('the release asks for a frame, so the map is never left stale', () => {
    const gl = {shadowMap: {autoUpdate: false}};
    let frames = 0;
    resumeShadows(gl, () => { frames += 1; });
    expect(frames).toBe(1);
  });

  test('a renderer that is not there yet is not a crash', () => {
    expect(() => freezeShadows(undefined)).not.toThrow();
    expect(() => freezeShadows({})).not.toThrow();
    expect(() => resumeShadows(undefined)).not.toThrow();
  });
});

describe('the viewport is wired to both', () => {
  test('the controls carry the tuned damping and freeze the shadow map', () => {
    expect(source).toMatch(/dampingFactor=\{ORBIT_DAMPING\}/);
    expect(source).toMatch(/onStart=\{\(\)=>freezeShadows\(gl\)\}/);
    expect(source).toMatch(/onEnd=\{\(\)=>resumeShadows\(gl,invalidate\)\}/);
  });

  test('the shadow map is put back if the view is left mid-drag', () => {
    expect(source).toMatch(/useEffect\(\(\)=>\(\)=>resumeShadows\(gl\),\[gl\]\)/);
  });

  test('the drawing buffer is no longer preserved for the download button', () => {
    // The capture renders and reads the canvas in the same task, which is what
    // makes preserveDrawingBuffer unnecessary — and it cost a copy every frame.
    expect(source).not.toMatch(/preserveDrawingBuffer/);
    expect(source).toMatch(/gl\.render\(scene,camera\);const a=document\.createElement/);
  });
});
