import {profileFrom, renderBudget, MOBILE_MAX_WIDTH, SHORT_MAX_HEIGHT} from './device';

describe('device profile', () => {
  it('classifies a phone as touch, compact and low quality', () => {
    const p = profileFrom({width: 390, height: 844, touch: true});
    expect(p).toMatchObject({mobile: true, short: false, compact: true, quality: 'low', touch: true});
  });

  it('keeps a desktop at full quality', () => {
    const p = profileFrom({width: 1440, height: 900});
    expect(p).toMatchObject({mobile: false, short: false, compact: false, quality: 'high'});
  });

  it('treats a landscape phone as short even though it is not narrow', () => {
    const p = profileFrom({width: 844, height: 390, touch: true});
    expect(p.width).toBeGreaterThan(MOBILE_MAX_WIDTH);
    expect(p.mobile).toBe(false);
    expect(p.short).toBe(true);
    expect(p.compact).toBe(true);
  });

  it('switches to compact exactly at the breakpoints', () => {
    expect(profileFrom({width: MOBILE_MAX_WIDTH, height: 900}).compact).toBe(true);
    expect(profileFrom({width: MOBILE_MAX_WIDTH + 1, height: 900}).compact).toBe(false);
    expect(profileFrom({width: 1200, height: SHORT_MAX_HEIGHT}).compact).toBe(true);
    expect(profileFrom({width: 1200, height: SHORT_MAX_HEIGHT + 1}).compact).toBe(false);
  });

  it('does not infer touch from size alone', () => {
    expect(profileFrom({width: 390, height: 844}).touch).toBe(false);
  });
});

describe('render budget', () => {
  const low = renderBudget(profileFrom({width: 390, height: 844, touch: true}));
  const high = renderBudget(profileFrom({width: 1440, height: 900}));

  it('clamps device pixel ratio lower on mobile', () => {
    expect(low.dpr).toEqual([1, 1.25]);
    expect(high.dpr).toEqual([1, 1.6]);
    expect(low.dpr[1]).toBeLessThan(high.dpr[1]);
  });

  it('drops the shadow map and environment probe on mobile', () => {
    expect(low.shadowMapSize).toBe(1024);
    expect(high.shadowMapSize).toBe(2048);
    expect(low.environmentResolution).toBe(64);
    expect(high.environmentResolution).toBe(128);
  });

  it('never raises cost on a small screen', () => {
    for (const key of ['shadowMapSize', 'environmentResolution', 'contactShadowBlur'] as const) {
      expect(low[key]).toBeLessThanOrEqual(high[key]);
    }
  });
});
