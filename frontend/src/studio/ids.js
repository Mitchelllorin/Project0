// An id for a design that has never been saved.
//
// This used to be `crypto.randomUUID()`, and that function exists only in a *secure
// context*: HTTPS, or localhost. Served over plain HTTP from anywhere else — a LAN
// address like http://192.168.1.50:3000, a machine name, a tunnel without TLS, which is
// exactly what a shortcut to "the studio on my machine" is — it is not there at all. It
// was called during the first render of StudioProvider, so the studio threw before it
// painted: no crash screen, no error on the page, an empty window and a console message.
// The crash recorder kept the receipt (.emergent/recordings/crash-*.json), which is how
// this was found.
//
// So the id is built here, from a chain that works in every context the studio is served
// in:
//
//   1. crypto.randomUUID()      the platform's own, when the context is secure.
//   2. crypto.getRandomValues() *not* restricted to secure contexts, so this is the one
//                               that actually runs on a plain-http address.
//   3. Math.random()            for anything older still. Weaker, and only used if it
//                               must be.
//
// All three produce the same v4 shape, so an id stored by one is valid to the others.
const BYTE = Array.from({length: 256}, (_, value) => value.toString(16).padStart(2, '0'));
const DASH_BEFORE = [4, 6, 8, 10];

function cryptoApi() {
  return typeof globalThis === 'undefined' ? undefined : globalThis.crypto;
}

// RFC 4122 version 4, lowercase, out of 16 bytes. Setting the version and variant bits is
// what makes this a uuid rather than 16 bytes with dashes in it.
function fromBytes(bytes) {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes.reduce((text, byte, index) =>
    `${text}${DASH_BEFORE.includes(index) ? '-' : ''}${BYTE[byte]}`, '');
}

export function newId() {
  const api = cryptoApi();
  // Called as a method, never as a detached reference: `randomUUID` throws
  // "Illegal invocation" if it is passed around unbound.
  if (api && typeof api.randomUUID === 'function') return api.randomUUID();
  const bytes = new Uint8Array(16);
  if (api && typeof api.getRandomValues === 'function') api.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return fromBytes(bytes);
}
