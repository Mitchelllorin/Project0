/**
 * Device profile for the studio: input capability, viewport class and the 3D
 * render budget that follows from it. Kept as pure functions so the thresholds
 * are unit-testable, with a small hook for live updates (rotation, resize).
 */
import {useEffect, useState} from 'react';

export const MOBILE_MAX_WIDTH = 700;
export const SHORT_MAX_HEIGHT = 520;

export function profileFrom({width, height, touch = false}) {
  const mobile = width <= MOBILE_MAX_WIDTH;
  const short = height <= SHORT_MAX_HEIGHT;
  const compact = mobile || short;
  return {width, height, touch, mobile, short, compact, quality: compact ? 'low' : 'high'};
}

/**
 * Render cost for a device. Phones get a lower DPR clamp, a smaller shadow map
 * and a lower-cost environment probe — the three things that dominate the frame
 * on mobile GPUs.
 */
export function renderBudget(profile) {
  const low = profile.quality === 'low';
  return {
    dpr: low ? [1, 1.25] : [1, 1.6],
    shadowMapSize: low ? 1024 : 2048,
    environmentResolution: low ? 64 : 128,
    contactShadowBlur: low ? 2 : 2.8,
  };
}

function read() {
  if (typeof window === 'undefined') return profileFrom({width: 1280, height: 800});
  const coarse =
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  return profileFrom({width: window.innerWidth, height: window.innerHeight, touch: coarse});
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState(read);
  useEffect(() => {
    const update = () => setProfile(read());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
    if (mq && mq.addEventListener) mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', update);
    };
  }, []);
  return profile;
}
