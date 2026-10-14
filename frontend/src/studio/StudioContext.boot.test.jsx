// "It doesn't run when I hit the icon."
//
// The studio asked for its project id with `crypto.randomUUID()`, which only exists in a
// secure context. Its own crash recorder kept the receipt (.emergent/recordings/crash-*.json):
//
//   TypeError: crypto.randomUUID is not a function
//       at StudioProvider (http://studio.test:3000/static/js/bundle.js:...
//
// That is the first render of the provider, so the studio died before it painted — and the
// error boundary sat *inside* the provider, so it could not catch it either. Opened from a
// shortcut, which points at the studio's own name rather than at localhost, the window
// simply stayed empty.
//
// So: the app has to boot on an address that is not a secure context. These mount the real
// provider — and then the real app, router and shell — with `crypto.randomUUID` taken away,
// which is what such an address looks like to the browser.
//
// The API is answered for GET /deployment (so `deployment.js` and its precedence rules run
// for real, rather than being stubbed out of the path being tested) and left hanging for
// POST /configure: this is about the first paint, not about a scene.
//
// Every mock implementation is set in `beforeEach` rather than in the factory, because
// react-scripts runs Jest with `resetMocks: true` — an implementation written once at module
// scope is stripped before the first test, and the symptom is a mock that returns undefined
// rather than a failure that names it.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import axios from 'axios';
import {StudioProvider} from './StudioContext';
import App from '../App';
import Studio from './Studio';

jest.mock('axios', () => ({get: jest.fn(), post: jest.fn(), put: jest.fn(), isCancel: () => false}));
jest.mock('../components/ui/sonner', () => ({Toaster: () => null}));
// react-router-dom v7 resolves through an exports map CRA's jest-resolve does not read.
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({children}) => <>{children}</>,
  // `end` is a router prop, not an attribute: passing it through to the anchor logs a
  // React warning that has nothing to do with what is being tested.
  NavLink: ({children, end, ...rest}) => <a {...rest}>{children}</a>,
  useLocation: () => ({pathname: '/'}),
  useNavigate: () => jest.fn(),
}));
// The canvas and the 3D modules it drags in do not load under jsdom.
jest.mock('three', () => ({}));
jest.mock('@react-three/fiber', () => ({Canvas: () => null, useThree: () => ({}), useFrame: () => {}}));
jest.mock('@react-three/drei', () => ({OrbitControls: () => null, Environment: () => null,
  Lightformer: () => null, ContactShadows: () => null, Line: () => null, TransformControls: () => null}));
jest.mock('./PartGeometry', () => ({Panel: () => null, PartMesh: () => null, Part: () => null}));
jest.mock('./Cabinet3D', () => ({Cabinet3D: () => null}));
jest.mock('./Room3D', () => ({Room3D: () => null}));

beforeAll(() => {globalThis.IS_REACT_ACT_ENVIRONMENT = true;});

beforeEach(() => {
  axios.get.mockImplementation(() => Promise.resolve({data: {
    brand: {name: 'Northline Cabinetry', subtitle: 'Trade studio', accent: '#4f8cff', logo_url: ''},
    catalog: 'euro32',
  }}));
  axios.post.mockImplementation(() => new Promise(() => {}));
  axios.put.mockImplementation(() => new Promise(() => {}));
});

const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
afterEach(() => {
  if (real) Object.defineProperty(globalThis, 'crypto', real);
  else delete globalThis.crypto;
});

// What an insecure context gives the page: getRandomValues, which is not restricted to
// secure contexts, and no randomUUID at all.
function withoutRandomUUID(){
  const crypto = globalThis.crypto || {};
  Object.defineProperty(globalThis, 'crypto', {
    value: crypto.getRandomValues ? {getRandomValues: crypto.getRandomValues.bind(crypto)} : undefined,
    configurable: true,
    writable: true,
  });
}

function mount(node){
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => createRoot(container).render(node));
  return container;
}

describe('the studio boots on an address that is not a secure context', () => {
  it('renders the app when crypto.randomUUID is not a function', () => {
    withoutRandomUUID();
    const c = mount(<App/>);
    // The shell painted, so the provider did not throw...
    expect(c.querySelector('[data-testid="studio-app"]')).not.toBeNull();
    // ...it asked the API for a scene and is waiting for it, which is what a boot looks
    // like, and it did not fall through to the crash screen.
    expect(c.querySelector('[data-testid="studio-loading"]')).not.toBeNull();
    expect(c.querySelector('[data-testid="studio-crash"]')).toBeNull();
  });

  it('renders the provider and the shell that sits inside it', () => {
    withoutRandomUUID();
    const c = mount(<StudioProvider><Studio/></StudioProvider>);
    expect(c.querySelector('[data-testid="studio-app"]')).not.toBeNull();
    expect(c.querySelector('[data-testid="studio-crash"]')).toBeNull();
  });

  it('renders the same way where randomUUID does exist', () => {
    const c = mount(<App/>);
    expect(c.querySelector('[data-testid="studio-app"]')).not.toBeNull();
    expect(c.querySelector('[data-testid="studio-crash"]')).toBeNull();
  });

  // The identity the server was configured with is adopted at boot, so a deployment is
  // branded without a rebuild. That fetch is a promise on the same code path as the crash,
  // and it must not be able to take the first paint down with it.
  it('adopts the deployment identity the API answers with', async() => {
    withoutRandomUUID();
    const c = mount(<App/>);
    await act(async() => {await Promise.resolve();});
    expect(c.querySelector('[data-testid="header-brand-title"]').textContent).toBe('Northline Cabinetry');
  });
});

describe('the id a design that has never been saved gets', () => {
  it('is kept in the design the studio holds, not regenerated per render', async() => {
    withoutRandomUUID();
    const c = mount(<App/>);
    const id = window.localStorage.getItem('kitchen-studio');
    expect(JSON.parse(id).id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(c.querySelector('[data-testid="studio-app"]')).not.toBeNull();
  });
});
