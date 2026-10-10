// Deployment identity: what *this install* is branded as and which catalog it ships
// with. Two sources, answering two different questions:
//
//   buildTimeDeployment()  the environment the bundle was built with. Baked in, so
//                          the first paint is already branded and never flashes.
//   fetchDeployment()      the server's copy, GET /api/deployment. Lets one built
//                          image serve several clients, re-branded by environment
//                          alone, and is what an install can be verified against.
//
// A visitor's own identity — saved locally, or carried in a share link — wins over
// both: a dealer puts *their* name on a proposal.
import axios from 'axios';

export const DEFAULT_BRAND = {name: '3D Learning Family', subtitle: 'Project Zero — Kitchen Visualizer', accent: '#dca55e', logo_url: ''};

// Mirrors the backend Brand model, so a value the API would reject is never adopted.
const BRAND_LIMITS = {name: 60, subtitle: 60, logo_url: 2000};
const ACCENT = /^#[0-9a-fA-F]{6}$/;

export function normalizeBrand(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const brand = {...DEFAULT_BRAND};
  for (const key of Object.keys(BRAND_LIMITS)) {
    const value = typeof source[key] === 'string' ? source[key].trim() : '';
    if (value && value.length <= BRAND_LIMITS[key]) brand[key] = value;
  }
  if (typeof source.accent === 'string' && ACCENT.test(source.accent)) brand.accent = source.accent;
  if (brand.logo_url && !brand.logo_url.startsWith('https://')) brand.logo_url = '';
  return brand;
}

// REACT_APP_* must be read as literals: Create React App substitutes them at build
// time, so they cannot be looked up in a loop.
export function buildTimeDeployment() {
  const brand = normalizeBrand({
    name: process.env.REACT_APP_BRAND_NAME,
    subtitle: process.env.REACT_APP_BRAND_SUBTITLE,
    accent: process.env.REACT_APP_BRAND_ACCENT,
    logo_url: process.env.REACT_APP_BRAND_LOGO_URL,
  });
  return {brand, catalog: (process.env.REACT_APP_DEFAULT_CATALOG || '').trim()};
}

export function normalizeDeployment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {brand: normalizeBrand(raw.brand), catalog: typeof raw.catalog === 'string' ? raw.catalog.trim() : ''};
}

// Never throws: an unreachable or older API must leave the built-in identity in
// place rather than break the studio.
export async function fetchDeployment(api, client = axios) {
  try {
    const {data} = await client.get(`${api}/deployment`);
    return normalizeDeployment(data);
  } catch (error) {
    return null;
  }
}

export function sameBrand(a, b) {
  return !!a && !!b && Object.keys(DEFAULT_BRAND).every(key => a[key] === b[key]);
}

// A subtitle an early build wrote into saved drafts. Never show it again.
const STALE_SUBTITLE = 'kitchexxxx xxx xxx';

function mergeBrand(base, partial) {
  const merged = normalizeBrand({...base, ...(partial || {})});
  if ((partial || {}).subtitle === STALE_SUBTITLE) merged.subtitle = base.subtitle;
  return merged;
}

// Whose identity the studio opens with. A design the visitor just opened, or branding
// they saved on this browser, is theirs and wins; otherwise it is the deployment's.
export function initialBrand(saved, built = buildTimeDeployment().brand) {
  return saved ? mergeBrand(built, saved) : {...built};
}

// Once the server has told us what this instance is configured as, adopt it — but only
// while the visitor has not made the identity their own.
export function adoptServerBrand(current, server, built = buildTimeDeployment().brand) {
  return sameBrand(current, built) ? normalizeBrand({...built, ...(server || {})}) : current;
}
