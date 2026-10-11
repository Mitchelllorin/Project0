// What matters here is the boundary, not the formatting helpers: a code is the only
// thing that leaves the browser, the tier comes back from the server, and a wrong code
// costs the dealer their stored code while an unreachable API does not.
import {
  DEALER_KEY, DEALER_HEADER, normalizeDealer, readDealerCode, rememberDealerCode,
  forgetDealerCode, dealerHeaders, fetchDealerSession, clientTotal, percent, dealerLabel,
} from './dealer';

const CODE = 'northline-2026-trade';

function fakeStorage(initial = {}) {
  const data = {...initial};
  return {
    data,
    getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: key => { delete data[key]; },
  };
}

function fakeClient(response, error) {
  return {post: jest.fn(async () => { if (error) throw error; return {data: response}; })};
}

const dealerPayload = {id: 'northline-01', name: 'Northline Kitchen & Bath', tier: 'trade',
  tier_name: 'Trade', discount: 0.35, region: 'NE'};

describe('signing in', () => {
  it('stores the code and nothing else', () => {
    const store = fakeStorage();
    rememberDealerCode(`  ${CODE}  `, store);
    expect(store.data[DEALER_KEY]).toBe(CODE);
    expect(readDealerCode(store)).toBe(CODE);
    expect(Object.keys(store.data)).toEqual([DEALER_KEY]);
  });

  it('refuses a blank or over-long code instead of half-storing it', () => {
    const store = fakeStorage();
    expect(rememberDealerCode('   ', store)).toBe('');
    expect(rememberDealerCode('x'.repeat(201), store)).toBe('');
    expect(store.data[DEALER_KEY]).toBeUndefined();
  });

  it('forgets the code on sign-out', () => {
    const store = fakeStorage({[DEALER_KEY]: CODE});
    forgetDealerCode(store);
    expect(readDealerCode(store)).toBe('');
  });

  it('survives storage being unavailable', () => {
    const hostile = {getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); }};
    expect(readDealerCode(hostile)).toBe('');
    expect(rememberDealerCode(CODE, hostile)).toBe(CODE);
    expect(() => forgetDealerCode(hostile)).not.toThrow();
  });

  it('sends the code as a header, and sends nothing when there is no code', () => {
    expect(dealerHeaders(CODE)).toEqual({[DEALER_HEADER]: CODE});
    expect(dealerHeaders('  ')).toEqual({});
    expect(dealerHeaders(undefined)).toEqual({});
  });
});

describe('the dealer the server reports', () => {
  it('is accepted when it is complete', () => {
    expect(normalizeDealer(dealerPayload)).toEqual(dealerPayload);
  });

  it('never carries the access code back', () => {
    const client = fakeClient({dealer: {...dealerPayload, code: CODE}});
    return fetchDealerSession('/api', CODE, client).then(result => {
      expect(result.dealer).toEqual(dealerPayload);
      expect(result.dealer).not.toHaveProperty('code');
      expect(JSON.stringify(result)).not.toContain(CODE);
      expect(JSON.stringify(result)).not.toContain('northline-2026');
    });
  });

  it('is rejected when it is not a dealer at all', () => {
    expect(normalizeDealer(null)).toBeNull();
    expect(normalizeDealer('northline')).toBeNull();
    expect(normalizeDealer({name: 'Northline'})).toBeNull();
    expect(normalizeDealer({id: 'northline-01', name: '   '})).toBeNull();
  });

  it('cannot claim a discount the server did not send', () => {
    expect(normalizeDealer({...dealerPayload, discount: 5}).discount).toBe(0);
    expect(normalizeDealer({...dealerPayload, discount: -0.2}).discount).toBe(0);
    expect(normalizeDealer({...dealerPayload, discount: 'lots'}).discount).toBe(0);
    expect(normalizeDealer({...dealerPayload, discount: 1}).discount).toBe(0);
    expect(normalizeDealer({...dealerPayload, discount: 1.5}).discount).toBe(0);
    // The boundary is the backend's: `ge=0, lt=1`, so a 100% discount is not a discount.
    expect(normalizeDealer({...dealerPayload, discount: 0.999}).discount).toBe(0.999);
    expect(normalizeDealer({...dealerPayload, discount: 0}).discount).toBe(0);
  });

  it('falls back to list naming rather than an empty tier', () => {
    expect(normalizeDealer({...dealerPayload, tier: '', tier_name: ''}))
      .toMatchObject({tier: 'list', tier_name: 'List'});
    expect(dealerLabel(null)).toBe('');
    expect(dealerLabel(dealerPayload)).toBe('Northline Kitchen & Bath · Trade');
  });
});

describe('what a failed sign-in costs the dealer', () => {
  it('reports a rejected code and hands back no dealer', async () => {
    const client = fakeClient(null, {response: {status: 401, data: {detail: 'That dealer access code is not recognised'}}});
    const result = await fetchDealerSession('/api', CODE, client);
    expect(result.dealer).toBeNull();
    expect(result.status).toBe(401);
    expect(result.message).toBe('That dealer access code is not recognised');
  });

  it('reports an unconfigured deployment without claiming the code was wrong', async () => {
    const client = fakeClient(null, {response: {status: 503, data: {detail: 'Dealer sign-in is not configured on this deployment'}}});
    const result = await fetchDealerSession('/api', CODE, client);
    expect(result.status).toBe(503);
    expect(result.message).toMatch(/not configured/);
  });

  it('leaves an unreachable API distinguishable from a bad code', async () => {
    const client = fakeClient(null, new Error('Network Error'));
    const result = await fetchDealerSession('/api', CODE, client);
    expect(result.status).toBeUndefined();
    expect(result.message).toMatch(/could not reach/);
  });
});

describe('the price the customer is shown', () => {
  it('is the list total when nobody is signed in', () => {
    expect(clientTotal({total: 6399.08})).toBe(6399.08);
    expect(clientTotal(null)).toBe(0);
  });

  it('is the dealer client price when someone is', () => {
    expect(clientTotal({total: 6399.08, price_tier: {client_total: 5759.17}})).toBe(5759.17);
  });

  it('formats a discount and a margin as percentages', () => {
    expect(percent(0.35)).toBe('35%');
    expect(percent(0.1834, 1)).toBe('18.3%');
    expect(percent(-0.055, 1)).toBe('-5.5%');
    expect(percent(undefined)).toBe('0%');
  });
});
