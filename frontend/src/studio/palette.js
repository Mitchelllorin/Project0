// UI palette system.
//
// BASE holds the studio's original chrome colours; the theme is derived at
// runtime by rotating hue and scaling saturation, so the interface can be
// recoloured without touching material swatches, feedback colours or the 3D
// scene. App.css references these through var(--cN) with neutral defaults.

export const BASE = {
  "--c1": "#171a18",
  "--c2": "#2b302c",
  "--c3": "#8b928a",
  "--c4": "#9ba199",
  "--c5": "#fafaf3",
  "--c6": "#e8ebe3",
  "--c7": "#99a293",
  "--c8": "#95ad86",
  "--c9": "#494b40",
  "--c10": "#e3c492",
  "--c11": "#282a23",
  "--c12": "#35372b",
  "--c13": "#f5d79b",
  "--c14": "#30352f",
  "--c15": "#1c201d",
  "--c16": "#8c9888",
  "--c17": "#838d80",
  "--c18": "#616a5d",
  "--c19": "#3f4439",
  "--c20": "#a2ac97",
  "--c21": "#131613",
  "--c22": "#343a31",
  "--c23": "#8c9785",
  "--c24": "#353b31",
  "--c25": "#e7e9df",
  "--c26": "#829077",
  "--c27": "#c0c9b7",
  "--c28": "#30362c",
  "--c29": "#e0e5d7",
  "--c30": "#394031",
  "--c31": "#414837",
  "--c32": "#dbe1d1",
  "--c33": "#32382b",
  "--c34": "#181c18",
  "--c35": "#2d342c",
  "--c36": "#818b7c",
  "--c37": "#30352b",
  "--c38": "#e6eadf",
  "--c39": "#363428",
  "--c40": "#343b2e",
  "--c41": "#959e8b",
  "--c42": "#414737",
  "--c43": "#1c201c",
  "--c44": "#353b30",
  "--c45": "#30372d",
  "--c46": "#e9eae2",
  "--c47": "#808c76",
  "--c48": "#8b9680",
  "--c49": "#d8ddd0",
  "--c50": "#7f8b73",
  "--c51": "#919d85",
  "--c52": "#e7c08a",
  "--c53": "#cbd1bd",
  "--c54": "#778368",
  "--c55": "#94a084",
  "--c56": "#919e80",
  "--c57": "#38412e",
  "--c58": "#d6ddc9",
  "--c59": "#9aa58c",
  "--c60": "#c8d0bb",
  "--c61": "#252d21",
  "--c62": "#414b36",
  "--c63": "#9baa85",
  "--c64": "#22291f",
  "--c65": "#d4dac9",
  "--c66": "#94a083",
  "--c67": "#3a442f",
  "--c68": "#dfc095",
  "--c69": "#313526",
  "--c70": "#7f8e6c",
  "--c71": "#c7c9c1",
  "--c72": "#54634d",
  "--c73": "#647958",
  "--c74": "#333e30",
  "--c75": "#6b7662",
  "--c76": "#4e5e42",
  "--c77": "#76896a55",
  "--c78": "#d7dcc977",
  "--c79": "#e0e4d3",
  "--c80": "#25301d",
  "--c81": "#75826a",
  "--c82": "#6b8458",
  "--c83": "#20261eed",
  "--c84": "#626c5255",
  "--c85": "#1a231528",
  "--c86": "#aab99a",
  "--c87": "#3e4a30",
  "--c88": "#f4f6e8",
  "--c89": "#444e37",
  "--c90": "#92a080",
  "--c91": "#4c5036",
  "--c92": "#e5d3a3",
  "--c93": "#6c7b5f",
  "--c94": "#7f8c71",
  "--c95": "#5c6c4d",
  "--c96": "#e1e6d1e6",
  "--c97": "#4b5d3a",
  "--c98": "#424c35",
  "--c99": "#323d26",
  "--c100": "#242d1c",
  "--c101": "#b5c19d",
  "--c102": "#8e9b7b",
  "--c103": "#909e7c",
  "--c104": "#e1e6d6",
  "--c105": "#8c9b77",
  "--c106": "#b5c1a0",
  "--c107": "#3b442f",
  "--c108": "#91a079",
  "--c109": "#c1cba9",
  "--c110": "#9eac89",
  "--c111": "#c4cead",
  "--c112": "#242719",
  "--c113": "#b6c19f",
  "--c114": "#4a553a",
  "--c115": "#323c26",
  "--c116": "#e1e6d4",
  "--c117": "#93a47c",
  "--c118": "#778763",
  "--c119": "#3b4530",
  "--c120": "#242c1e",
  "--c121": "#e1e6d1",
  "--c122": "#82906c",
  "--c123": "#c0cbaa",
  "--c124": "#171c16",
  "--c125": "#353e2c",
  "--c126": "#7d8c67",
  "--c127": "#8ca870",
  "--c128": "#4c563d",
  "--c129": "#8c9e70",
  "--c130": "#ebeedf",
  "--c131": "#aab991",
  "--c132": "#eff0e4",
  "--c133": "#a7b397",
  "--c134": "#a5b28f",
  "--c135": "#a6b48d",
  "--c136": "#495538",
  "--c137": "#84966a",
  "--c138": "#c8d2b0",
  "--c139": "#8d9f73",
  "--c140": "#414c32",
  "--c141": "#98ac79",
  "--c142": "#303c25",
  "--c143": "#aebf94",
  "--c144": "#2d3823",
  "--c145": "#ecf0df",
  "--c146": "#3b402c",
  "--c147": "#e6d5ac",
  "--c148": "#7e9360",
  "--c149": "#1e271b",
  "--c150": "#62784b77",
  "--c151": "#10180922",
  "--c152": "#d5dec2",
  "--c153": "#8b9e70",
  "--c154": "#5d7046",
  "--c155": "#e1c696",
  "--c156": "#a6b48c",
  "--c157": "#45513a",
  "--c158": "#2d3826",
  "--c159": "#46583a",
  "--c160": "#9bad83",
  "--c161": "#849865",
  "--c162": "#3d4f2d",
  "--c163": "#8ea36e",
  "--c164": "#c9d4b6",
  "--c165": "#20271b",
  "--c166": "#566440",
  "--c167": "#d8e3c5",
  "--c168": "#9dab86",
  "--c169": "#435033",
  "--c170": "#9cad84",
  "--c171": "#383f28",
  "--c172": "#94a77b",
  "--c173": "#1b2119",
  "--c174": "#8c9f72",
  "--c175": "#e6ecdb",
  "--c176": "#9bad84",
  "--c177": "#3b4a2d",
  "--c178": "#3d4d2d",
  "--c179": "#92a776",
  "--c180": "#baca9e",
  "--c181": "#e0e8d3",
  "--c182": "#8da572",
  "--c183": "#455833",
  "--c184": "#8fa474",
  "--c185": "#839c65",
  "--c186": "#344929",
  "--c187": "#c4d4af",
  "--c188": "#cbdaba",
  "--c189": "#7e9a60",
  "--c190": "#435733",
  "--c191": "#a1b685",
  "--c192": "#222e1a",
  "--c193": "#4b6038",
  "--c194": "#d6e3c2",
  "--c195": "#6d874f",
  "--c196": "#405a2d",
  "--c197": "#9fb980",
  "--c198": "#d2e2bb",
  "--c199": "#425d2c",
  "--c200": "#405d2a",
  "--c201": "#8ba66c",
  "--c202": "#415b2b",
  "--c203": "#35462a",
  "--c204": "#202d18",
  "--c205": "#9bb97708",
  "--c206": "#9bb77c",
  "--c207": "#bace9e",
  "--c208": "#7f9e60",
  "--c209": "#8ead6b",
  "--c210": "#405b2b",
  "--c211": "#202320",
  "--c212": "#181c19",
  "--c213": "#1d211e",
  "--c214": "#242923",
  "--c215": "#1c211d",
  "--c216": "#303b31",
  "--c217": "#232a23",
  "--c218": "#253021e8",
  "--c219": "#75826266",
  "--c220": "#d2daba",
  "--c221": "#bfccad",
  "--c222": "#0e180633",
  "--c223": "#405333",
  "--c224": "#30372c",
  "--c225": "#86957355",
  "--c226": "#414c33",
  "--c227": "#a4b288",
  "--c228": "#a69d77",
  "--c229": "#323928",
  "--c230": "#dcc79d"
};

// shadcn/Tailwind HSL tokens (hue, saturation%, lightness%) used by the base layer.
export const BASE_HSL = {
  "--background": [150, 5, 9],
  "--foreground": [60, 8, 91],
  "--card": [150, 5, 12],
  "--card-foreground": [60, 8, 91],
  "--popover": [150, 5, 12],
  "--popover-foreground": [60, 8, 91],
  "--secondary": [140, 4, 17],
  "--secondary-foreground": [60, 8, 91],
  "--muted": [140, 4, 17],
  "--muted-foreground": [135, 4, 59],
  "--accent": [140, 4, 19],
  "--accent-foreground": [60, 8, 91],
  "--border": [140, 4, 19],
  "--input": [140, 4, 24]
};

// The theme the studio is measured against is a technical viewer: slate navy chrome, cyan
// for anything that is carrying an answer, and a dark room behind the model. That is a
// *different base*, not a rotation of this one — the studio's own base is a warm near-grey,
// and rotating something close to grey produces another thing close to grey, so no hue
// shift can reach navy from here. So the blueprint base is derived from this one by rule:
// what reads as colour becomes the cyan, what reads as grey becomes navy slate. It is
// derived rather than typed in, so the two themes cannot drift apart when the stylesheet
// gains another variable.
export const BLUEPRINT_HUE = 220;     // slate navy
const ACCENT_HUE = 196;              // the cyan something is written in
const NEUTRAL_SATURATION = 0.12;     // below this a colour is reading as grey, not as colour
const SLATE_SATURATION = 0.16;
const NEUTRAL_DEPTH = 0.86;          // greys sit a little deeper in navy than in daylight

export const BLUEPRINT = {id:'blueprint',name:'Blueprint',detail:'Slate navy, cyan accent',hue:0,sat:1,base:'blueprint',backdrop:'#0a1018'};

export const PALETTE_PRESETS = [
  BLUEPRINT,
  {id:'graphite',name:'Graphite',detail:'Neutral, no green',hue:0,sat:0.1},
  {id:'midnight',name:'Midnight',detail:'Cool blue slate',hue:95,sat:1},
  {id:'violet',name:'Violet',detail:'Cool violet',hue:150,sat:1},
  {id:'ember',name:'Ember',detail:'Warm amber',hue:-90,sat:1},
  {id:'sage',name:'Sage',detail:'Original studio green',hue:0,sat:1},
];

export const DEFAULT_PALETTE = BLUEPRINT;

function parseHex(hex) {
  const x = hex.replace('#', '');
  if (x.length === 3) return {r: parseInt(x[0] + x[0], 16), g: parseInt(x[1] + x[1], 16), b: parseInt(x[2] + x[2], 16), a: 255};
  if (x.length === 4) return {r: parseInt(x[0] + x[0], 16), g: parseInt(x[1] + x[1], 16), b: parseInt(x[2] + x[2], 16), a: parseInt(x[3] + x[3], 16)};
  if (x.length === 6) return {r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: 255};
  return {r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: parseInt(x.slice(6, 8), 16)};
}

function componentToHex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

function transformHex(hex, hueDelta, satScale) {
  const {r, g, b, a} = parseHex(hex);
  if (r === 0 && g === 0 && b === 0) return hex;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  const nh = (((h * 360 + hueDelta) % 360) + 360) % 360 / 360;
  const ns = Math.max(0, Math.min(1, s * satScale));
  let r2, g2, b2;
  if (ns === 0) { r2 = g2 = b2 = l; }
  else {
    const q = l < 0.5 ? l * (1 + ns) : l + ns - l * ns;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r2 = hue2rgb(p, q, nh + 1 / 3); g2 = hue2rgb(p, q, nh); b2 = hue2rgb(p, q, nh - 1 / 3);
  }
  const out = '#' + componentToHex(r2 * 255) + componentToHex(g2 * 255) + componentToHex(b2 * 255);
  return a >= 255 ? out : out + componentToHex(a);
}

function toHsl(hex) {
  const {r, g, b, a} = parseHex(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return {h: 0, s: 0, l, a};
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return {h: h * 360, s, l, a};
}

function fromHsl({h, s, l, a}) {
  const nh = (((h % 360) + 360) % 360) / 360;
  const ns = Math.max(0, Math.min(1, s));
  let r, g, b;
  if (ns === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + ns) : l + ns - l * ns;
    const p = 2 * l - q;
    const channel = t => {
      let x = t;
      if (x < 0) x += 1; if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    };
    r = channel(nh + 1 / 3); g = channel(nh); b = channel(nh - 1 / 3);
  }
  const out = '#' + componentToHex(r * 255) + componentToHex(g * 255) + componentToHex(b * 255);
  return a >= 255 ? out : out + componentToHex(a);
}

// One colour of the studio's theme, as it would be in the blueprint theme.
export function blueprintOf(hex) {
  const {s, l, a} = toHsl(hex);
  const colour = s >= NEUTRAL_SATURATION;
  return fromHsl({
    h: colour ? ACCENT_HUE : BLUEPRINT_HUE,
    s: colour ? Math.min(1, s * 1.05) : SLATE_SATURATION,
    l: colour ? l : l * NEUTRAL_DEPTH,
    a,
  });
}

// The shadcn tokens, the same way. They are all near-neutral in the studio's theme, so in
// practice they all become navy — but the rule is the rule, and a token that gains colour
// later takes the cyan with everything else.
export function blueprintToken([, s, l]) {
  const colour = s / 100 >= NEUTRAL_SATURATION;
  // Lightness is kept: these tokens are the shadcn layer's own contrast pairs, and moving
  // them is how a theme ends up with text that cannot be read against its own background.
  return [colour ? ACCENT_HUE : BLUEPRINT_HUE, colour ? Math.min(100, s * 1.05) : SLATE_SATURATION * 100, l];
}

export const BLUEPRINT_BASE = Object.fromEntries(Object.entries(BASE).map(([name, hex]) => [name, blueprintOf(hex)]));

export const PALETTE_BASES = {studio: BASE, blueprint: BLUEPRINT_BASE};

// Which base a palette is drawn on. The preset's own `base` wins; a palette the sliders have
// taken over (`id: 'custom'`) carries the base it was derived from, so dragging the hue while
// the navy theme is on shifts the navy rather than snapping back to the studio's olive.
export function baseNameOf(palette) {
  const chosen = palette && palette.base;
  if (chosen && PALETTE_BASES[chosen]) return chosen;
  const preset = PALETTE_PRESETS.find(entry => entry.id === (palette && palette.id));
  return (preset && preset.base) || 'studio';
}

export function baseOf(palette) {
  return PALETTE_BASES[baseNameOf(palette)];
}

// The room behind the model, when the theme brings one. Null means the studio's own
// daylight floor, which is what every theme except the blueprint uses.
export function viewerBackgroundOf(palette) {
  const preset = PALETTE_PRESETS.find(entry => entry.id === (palette && palette.id));
  if (preset && preset.backdrop) return preset.backdrop;
  return baseNameOf(palette) === 'blueprint' ? BLUEPRINT.backdrop : null;
}

export function applyPalette(palette) {
  const {hue, sat} = {...DEFAULT_PALETTE, ...(palette || {})};
  const base = baseOf(palette);
  const root = document.documentElement;
  const vars = {};
  Object.entries(base).forEach(([name, hex]) => {
    vars[name] = transformHex(hex, hue, sat);
  });
  Object.entries(BASE_HSL).forEach(([name, [h, s, l]]) => {
    const token = base === BASE ? [h, s, l] : blueprintToken([h, s, l]);
    const [th, ts, tl] = token;
    vars[name] = `${(((th + hue) % 360) + 360) % 360} ${Math.max(0, Math.min(100, ts * sat)).toFixed(2)}% ${tl}%`;
  });
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  // Cache the resolved values so public/index.html can re-apply them before
  // first paint on the next load (avoids a flash of the default palette).
  try {
    localStorage.setItem('kitchen-studio-palette-vars', JSON.stringify(vars));
  } catch (e) {
    /* storage unavailable — the theme still applies for this session */
  }
}
