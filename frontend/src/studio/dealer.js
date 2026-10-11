// Dealer accounts: one deployment serves one manufacturer, and its dealers sign in
// with an access code that manufacturer sells to them at a trade tier.
//
// Only the code lives here, and only in this browser. The tier is resolved on the
// server from the code alone, so nothing the studio sends — no request body, no saved
// design, no share link — can name a discount. A shared link is therefore priced by
// whoever opens it, which is the point: the same kitchen costs a dealer and a
// homeowner different amounts, from one URL.
import axios from 'axios';

export const DEALER_KEY = 'kitchen-studio-dealer';
export const DEALER_HEADER = 'X-Dealer-Code';
// The backend refuses codes shorter than 8 characters; this is the other end.
const MAX_CODE = 200;

// Mirrors the backend DealerView, so a value the API would never send is never adopted.
export function normalizeDealer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!id || !name) return null;
  const discount = Number(raw.discount);
  return {
    id,
    name,
    tier: typeof raw.tier === 'string' && raw.tier.trim() ? raw.tier.trim() : 'list',
    tier_name: typeof raw.tier_name === 'string' && raw.tier_name.trim() ? raw.tier_name.trim() : 'List',
    discount: Number.isFinite(discount) && discount >= 0 && discount < 1 ? discount : 0,
    region: typeof raw.region === 'string' ? raw.region.trim() : '',
  };
}

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // private mode, or storage disabled: the session just will not persist
  }
}

export function readDealerCode(store = browserStorage()) {
  try {
    const code = store && store.getItem(DEALER_KEY);
    return typeof code === 'string' ? code.trim() : '';
  } catch {
    return '';
  }
}

// Returns what was stored, or '' when nothing could be — so a caller knows whether the
// session will survive a reload.
export function rememberDealerCode(code, store = browserStorage()) {
  const trimmed = typeof code === 'string' ? code.trim() : '';
  if (!trimmed || trimmed.length > MAX_CODE) return '';
  try {
    if (store) store.setItem(DEALER_KEY, trimmed);
  } catch {
    // Not fatal: the dealer stays signed in for this tab, just not the next one.
  }
  return trimmed;
}

export function forgetDealerCode(store = browserStorage()) {
  try {
    if (store) store.removeItem(DEALER_KEY);
  } catch {
    /* nothing to do */
  }
}

// The whole of the authentication: a header the server resolves. Never a body field, so
// it can never be part of a design, a saved project or a share link.
export function dealerHeaders(code) {
  const trimmed = typeof code === 'string' ? code.trim() : '';
  return trimmed ? {[DEALER_HEADER]: trimmed} : {};
}

// Never throws, and says *why* it failed: "wrong code" and "the API is down" have to be
// told apart, because only one of them should cost the dealer their stored code.
export async function fetchDealerSession(api, code, client = axios) {
  try {
    const {data} = await client.post(`${api}/dealer/session`, {code}, {headers: dealerHeaders(code)});
    const dealer = normalizeDealer(data && data.dealer);
    return dealer ? {dealer} : {dealer: null, status: 500, message: 'The studio did not recognise the reply from the dealer service'};
  } catch (error) {
    const response = error && error.response;
    const detail = response && response.data && response.data.detail;
    return {
      dealer: null,
      status: response && response.status,
      message: typeof detail === 'string' && detail ? detail
        : response ? 'That access code was not accepted'
        : 'The studio could not reach the dealer service',
    };
  }
}

export const dealerLabel = dealer => (dealer ? `${dealer.name} · ${dealer.tier_name}` : '');

// What the customer is quoted. Without a signed-in dealer this is simply the list total;
// with one it is their client price, which is the number the PDF has to show.
export function clientTotal(quote) {
  if (!quote) return 0;
  return quote.price_tier ? quote.price_tier.client_total : quote.total;
}

export function percent(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${(number * 100).toFixed(digits)}%`;
}
