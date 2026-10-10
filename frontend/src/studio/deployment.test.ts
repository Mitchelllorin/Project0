import {adoptServerBrand, buildTimeDeployment, fetchDeployment, initialBrand, normalizeBrand, normalizeDeployment, sameBrand, DEFAULT_BRAND} from './deployment';

const brandVars = ['REACT_APP_BRAND_NAME', 'REACT_APP_BRAND_SUBTITLE', 'REACT_APP_BRAND_ACCENT', 'REACT_APP_BRAND_LOGO_URL', 'REACT_APP_DEFAULT_CATALOG'];

describe('deployment identity', () => {
  const saved = {...process.env};
  afterEach(() => {
    brandVars.forEach(key => { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; });
  });

  it('falls back to the built-in identity when the build was not branded', () => {
    brandVars.forEach(key => delete process.env[key]);
    expect(buildTimeDeployment()).toEqual({brand: DEFAULT_BRAND, catalog: ''});
  });

  it('takes the identity of the build it was compiled into', () => {
    process.env.REACT_APP_BRAND_NAME = 'Northline Cabinetry';
    process.env.REACT_APP_BRAND_SUBTITLE = 'Kitchen Configurator';
    process.env.REACT_APP_BRAND_ACCENT = '#4f8cff';
    process.env.REACT_APP_DEFAULT_CATALOG = 'northline-example';
    const built = buildTimeDeployment();
    expect(built.brand).toEqual({name: 'Northline Cabinetry', subtitle: 'Kitchen Configurator', accent: '#4f8cff', logo_url: ''});
    expect(built.catalog).toBe('northline-example');
  });

  it('keeps the fallback for fields the build left unset', () => {
    brandVars.forEach(key => delete process.env[key]);
    process.env.REACT_APP_BRAND_NAME = 'Northline Cabinetry';
    expect(buildTimeDeployment().brand.subtitle).toBe(DEFAULT_BRAND.subtitle);
  });

  it('drops a malformed value instead of adopting it', () => {
    expect(normalizeBrand({name: 'Northline', accent: 'blue'}).accent).toBe(DEFAULT_BRAND.accent);
    expect(normalizeBrand({name: 'x'.repeat(61)}).name).toBe(DEFAULT_BRAND.name);
    expect(normalizeBrand({logo_url: 'http://insecure.example.com/logo.png'}).logo_url).toBe('');
    expect(normalizeBrand({logo_url: 'https://cdn.example.com/logo.svg'}).logo_url).toBe('https://cdn.example.com/logo.svg');
  });

  it('never yields an empty or unusable brand', () => {
    for (const junk of [null, undefined, 'Northline', 42, [], {name: '   '}]) {
      const brand = normalizeBrand(junk as any);
      expect(Object.keys(brand).sort()).toEqual(Object.keys(DEFAULT_BRAND).sort());
      expect(brand.name.length).toBeGreaterThan(0);
      expect(brand.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('rejects a payload that is not a deployment', () => {
    expect(normalizeDeployment(null)).toBeNull();
    expect(normalizeDeployment('euro32')).toBeNull();
    expect(normalizeDeployment(undefined)).toBeNull();
  });

  it('fills a partial deployment payload from the defaults', () => {
    expect(normalizeDeployment({brand: {name: 'Northline Cabinetry'}})).toEqual({brand: {...DEFAULT_BRAND, name: 'Northline Cabinetry'}, catalog: ''});
    expect(normalizeDeployment({catalog: 'northline-example'}).catalog).toBe('northline-example');
  });

  it('reports whether a brand is still the deployment default', () => {
    expect(sameBrand(DEFAULT_BRAND, {...DEFAULT_BRAND})).toBe(true);
    expect(sameBrand({...DEFAULT_BRAND, name: 'Dealer Kitchens'}, DEFAULT_BRAND)).toBe(false);
    expect(sameBrand(null as any, DEFAULT_BRAND)).toBe(false);
  });

  it('a saved or shared identity is the visitor\'s and wins over the deployment', () => {
    expect(initialBrand({name: 'Dealer Kitchens', accent: '#94b6a0'}, DEFAULT_BRAND))
      .toEqual({...DEFAULT_BRAND, name: 'Dealer Kitchens', accent: '#94b6a0'});
    expect(initialBrand(undefined, DEFAULT_BRAND)).toEqual(DEFAULT_BRAND);
  });

  it('retires a placeholder subtitle an early build saved', () => {
    expect(initialBrand({name: 'Dealer Kitchens', subtitle: 'kitchexxxx xxx xxx'}, DEFAULT_BRAND).subtitle)
      .toBe(DEFAULT_BRAND.subtitle);
  });

  it('adopts the server identity only while the visitor has not made it their own', () => {
    const northline = {...DEFAULT_BRAND, name: 'Northline Cabinetry', accent: '#4f8cff'};
    expect(adoptServerBrand(DEFAULT_BRAND, northline, DEFAULT_BRAND)).toEqual(northline);
    expect(adoptServerBrand({...DEFAULT_BRAND, name: 'Dealer Kitchens'}, northline, DEFAULT_BRAND)).toEqual({...DEFAULT_BRAND, name: 'Dealer Kitchens'});
    // A junk payload must not be able to blank an identity out.
    expect(adoptServerBrand(DEFAULT_BRAND, {accent: 'chartreuse'}, DEFAULT_BRAND)).toEqual(DEFAULT_BRAND);
  });

  it('reads the server copy of the identity', async () => {
    const client = {get: jest.fn().mockResolvedValue({data: {brand: {name: 'Northline Cabinetry'}, catalog: 'northline-example'}})};
    await expect(fetchDeployment('/api', client as any)).resolves.toEqual({brand: {...DEFAULT_BRAND, name: 'Northline Cabinetry'}, catalog: 'northline-example'});
    expect(client.get).toHaveBeenCalledWith('/api/deployment');
  });

  it('an unreachable API resolves to null rather than breaking the studio', async () => {
    const client = {get: jest.fn().mockRejectedValue(new Error('offline'))};
    await expect(fetchDeployment('/api', client as any)).resolves.toBeNull();
  });
});
