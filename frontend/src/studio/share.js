// Shareable design links.
//
// The entire configuration travels in the URL hash so a prospect can reopen or
// forward the exact design (option 3 of the "save/share a configuration" bar).
// Percent-encoded JSON keeps this dependency-free and correct for any Unicode
// brand name, unlike raw btoa.

export function encodeState(state) {
  try {
    return encodeURIComponent(JSON.stringify(state));
  } catch (error) {
    return '';
  }
}

export function decodeState(encoded) {
  try {
    return JSON.parse(decodeURIComponent(encoded));
  } catch (error) {
    return null;
  }
}

export function readShareHash(hash) {
  try {
    const match = (hash || '').match(/[#&]d=([^&]+)/);
    return match ? decodeState(match[1]) : null;
  } catch (error) {
    return null;
  }
}
