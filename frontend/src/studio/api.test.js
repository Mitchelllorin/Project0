// A baked-in http://localhost:8001 is only reachable from the machine it names. These
// lock the two halves of that: local development keeps its explicit backend, and every
// other origin falls back to the same origin, which the dev server and nginx both proxy
// to the real API. Getting this wrong is a studio stuck on "Preparing your studio".
import { isLoopback, resolveApiBase } from './api';

describe('isLoopback', () => {
  it.each([
    'http://localhost:8001',
    'https://localhost',
    'http://127.0.0.1:8001',
    'http://127.0.0.1',
    'http://0.0.0.0:8001',
    'http://[::1]:8001',
  ])('treats %s as this machine', url => expect(isLoopback(url)).toBe(true));

  it.each([
    'https://pv-abc-123.style.dev',
    'http://192.168.1.9:8001',
    'https://api.example.com',
    '',
    undefined,
    null,
  ])('does not treat %s as this machine', url => expect(isLoopback(url)).toBe(false));
});

describe('resolveApiBase', () => {
  it('falls back to the same origin when nothing was configured, as the image ships', () => {
    expect(resolveApiBase('', 'https://pv-abc.style.dev')).toBe('');
    expect(resolveApiBase(undefined, 'http://localhost:3000')).toBe('');
  });

  it('keeps an explicit backend for local development', () => {
    expect(resolveApiBase('http://localhost:8001', 'http://localhost:3000')).toBe('http://localhost:8001');
    expect(resolveApiBase('http://127.0.0.1:8001', 'http://127.0.0.1:3000')).toBe('http://127.0.0.1:8001');
  });

  it('drops a loopback backend the browser could not reach', () => {
    expect(resolveApiBase('http://localhost:8001', 'https://pv-abc.style.dev')).toBe('');
    expect(resolveApiBase('http://127.0.0.1:8001', 'http://192.168.1.9:3000')).toBe('');
  });

  it('leaves a real remote backend alone', () => {
    expect(resolveApiBase('https://api.example.com', 'https://studio.example.com')).toBe('https://api.example.com');
  });

  it('tolerates a trailing slash and surrounding space', () => {
    expect(resolveApiBase(' http://localhost:8001/ ', 'http://localhost:3000')).toBe('http://localhost:8001');
    expect(resolveApiBase(' https://api.example.com// ', 'https://studio.example.com')).toBe('https://api.example.com');
  });

  it('never returns a loopback base to a page served from anywhere else', () => {
    for (const page of ['https://pv-abc.style.dev', 'http://192.168.1.9:3000', 'https://kitchens.example.com']) {
      for (const backend of ['http://localhost:8001', 'http://127.0.0.1:8001', 'http://[::1]:8001']) {
        expect(resolveApiBase(backend, page)).toBe('');
      }
    }
  });
});
