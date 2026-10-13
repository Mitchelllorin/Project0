// Where the studio sends its API calls.
//
// REACT_APP_BACKEND_URL is baked into the bundle at build time. For local work it is
// http://localhost:8001, and that address means *the machine running the browser*. Served
// from anywhere else — a preview tunnel, a phone on the LAN, a client's screen — the
// browser would call its own localhost, POST /api/configure would fail, and the studio
// would sit on "Preparing your studio" with nothing to click.
//
// The studio is built for a single origin: nginx serves the bundle and proxies /api to the
// API container (see nginx.conf), and the dev server proxies /api the same way. A loopback
// backend URL is therefore only worth honouring when the page itself came from loopback;
// anywhere else, this origin is the one the browser can actually reach.
const LOOPBACK = /^(https?:\/\/)?(localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])(:\d+)?$/i;

export function isLoopback(url) {
  return typeof url === 'string' && LOOPBACK.test(url.trim());
}

// '' means "the same origin", which is what every deployment except local development
// wants. Pure, so the decision can be tested without a browser.
export function resolveApiBase(configured, pageOrigin) {
  const backend = typeof configured === 'string' ? configured.trim().replace(/\/+$/, '') : '';
  if (!backend || !isLoopback(backend)) return backend;
  return isLoopback(pageOrigin) ? backend : '';
}

export const API_BASE = resolveApiBase(
  process.env.REACT_APP_BACKEND_URL,
  typeof window === 'undefined' ? '' : window.location.origin,
);
