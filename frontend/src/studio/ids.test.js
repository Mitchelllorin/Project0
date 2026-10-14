// The studio asks for one id per design that has never been saved. That call used to be
// `crypto.randomUUID()`, which exists only in a secure context — and a plain-http address
// that is not localhost is not one, so on a LAN address the studio threw on its first
// render and the window stayed empty. These are the three contexts it can be served in.
import {newId} from './ids';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

function withCrypto(value){
  Object.defineProperty(globalThis, 'crypto', {value, configurable: true, writable: true});
}

afterEach(() => {
  if (real) Object.defineProperty(globalThis, 'crypto', real);
  else delete globalThis.crypto;
});

describe('the id a new design gets', () => {
  it('is a version 4 uuid', () => {
    expect(newId()).toMatch(V4);
  });

  it('is the platform\u2019s own when the page is in a secure context', () => {
    const randomUUID = jest.fn(() => '11111111-2222-4333-8444-555555555555');
    withCrypto({randomUUID});
    expect(newId()).toBe('11111111-2222-4333-8444-555555555555');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('calls it as a method, never as a detached reference', () => {
    // `crypto.randomUUID` throws "Illegal invocation" when it is passed around unbound.
    const randomUUID = jest.fn(function(){ return '11111111-2222-4333-8444-555555555555'; });
    withCrypto({randomUUID});
    expect(() => newId()).not.toThrow();
  });

  // The reported failure: over plain http from anything but localhost, `randomUUID` is
  // simply not a function. `getRandomValues` is not restricted to secure contexts, so it
  // is what has to carry this case.
  it('falls back to getRandomValues when there is no randomUUID — a LAN address over http', () => {
    const getRandomValues = jest.fn(bytes => { for (let i = 0; i < bytes.length; i += 1) bytes[i] = i; return bytes; });
    withCrypto({getRandomValues});
    // Bytes 0..15 with the version and variant bits forced: v4, variant 1.
    expect(newId()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(getRandomValues).toHaveBeenCalled();
  });

  it('falls back again when randomUUID is present but not callable', () => {
    withCrypto({randomUUID: undefined, getRandomValues: bytes => {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = 7;
      return bytes;
    }});
    expect(newId()).toMatch(V4);
  });

  it('is still a uuid when there is no crypto object at all', () => {
    withCrypto(undefined);
    expect(newId()).toMatch(V4);
    expect(new Set(Array.from({length: 200}, newId)).size).toBe(200);
  });

  it('never repeats an id, whichever path it took', () => {
    withCrypto({getRandomValues: bytes => {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
      return bytes;
    }});
    expect(new Set(Array.from({length: 200}, newId)).size).toBe(200);
  });
});
