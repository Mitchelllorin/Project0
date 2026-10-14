// Wall framing, and what a cabinet standing against it is actually fixed to.
//
// A run of cabinets holds on a stud wall because its screws land in studs. Where there is
// no timber behind a cabinet's end, that end cannot be screwed to the wall at all: it needs
// a cleat spanning two studs, or an anchor rated for the load — and on a finished wall there
// is no way to see which of those you have. So the studio can draw the framing with the
// drywall ghosted out and say, cabinet by cabinet, what is holding it.
//
// This is also where the room's own geometry lives, rather than in the component that draws
// it, so the framing and the drywall covering it cannot drift apart and the arithmetic can
// be tested without a canvas.
//
// Everything is millimetres, in room coordinates: x runs along the back wall, z out from it,
// y up. A run's first cabinet starts at x = 0, against the corner.

export const STUD_WIDTH = 38;      // mm — what 38x89 CLS (a "2x4") measures on its narrow face
export const STUD_DEPTH = 89;      // mm — its wide face: how far it stands off the wall
export const PLATE = 38;           // mm — the horizontal members the studs are nailed between
export const CLEAT_REACH = 250;    // mm — how far in from a cabinet's end a screw may sit
export const SPACINGS = [400, 600];// mm — the centres this studio frames at
export const DEFAULT_SPACING = 600;
export const WALL_HEIGHT = 2700;   // mm
export const DRYWALL = 12.5;       // mm — one sheet: the layer the cabinets hang on

// The rooms this studio frames: the back wall always, the return wall only in an L.
export const WALLS = {back: 'back', return: 'return'};

// The room, to the millimetre, as Room3D draws it. `centre` is the wall's centre plane on
// the axis it does not run along; `from`/`to` are its ends on the axis it does. A stud's
// position along the wall and its position in the room are therefore one addition apart.
// `inward` is which way the room is from that centre plane: a back wall opens toward +z and
// a right-hand return opens toward -x, which is what everything standing off a wall needs.
export function roomFaces(backWidth) {
  return {
    back: {axis: 'x', centre: -75, thickness: 90, inward: 1, from: -475, to: (backWidth + .175) * 1000},
    return: {axis: 'z', centre: (backWidth + .055) * 1000, thickness: 90, inward: -1, from: -100, to: 2700},
  };
}

// How long the back wall is, in metres, from the cabinets standing against it. Room3D sizes
// the drywall, the tile and the ceiling from this, so a change here moves all of them.
export function backWallWidth(cabinets = []) {
  const corner = cabinets.find(c => c.kind === 'corner');
  if (corner) return corner.position[0] / 1000 + corner.width / 2000;
  const onBack = cabinets.filter(c => c.position[2] < 1000);
  if (!onBack.length) return 3048 / 1000;
  return Math.max(...onBack.map(c => c.position[0] / 1000 + c.width / 2000));
}

// The studs in one wall, measured along it from its near end.
//
// A stud at each end — the corner studs, which carry the wall — and no bay wider than the
// centres asked for. A wall is rarely a whole number of bays, and the last bay is the one
// that pays: two studs a hand's width apart at the end of a run is worse joinery than bays
// that are all slightly narrower, and a bay slightly narrow still holds a screw. So the
// centres that come out are the centres that were achieved, and they are reported rather
// than assumed: 600 asked for on a 4002.8 mm wall is 571.8.
export function studsFor(length, centres = DEFAULT_SPACING) {
  if (!(length > 0) || !(centres > 0)) return [];
  const bays = Math.max(1, Math.ceil(length / centres));
  return Array.from({length: bays + 1}, (_, index) => round((length * index) / bays));
}

export function spacingOf(length, centres = DEFAULT_SPACING) {
  if (!(length > 0) || !(centres > 0)) return centres;
  return round(length / Math.max(1, Math.ceil(length / centres)));
}

// The studs of one wall, in room coordinates.
export function studsAlong(face, centres = DEFAULT_SPACING) {
  return studsFor(face.to - face.from, centres).map(offset => round(face.from + offset));
}

// Which wall a cabinet is standing against, and the span it covers along it. A cabinet
// against neither wall — the island, or one moved off the run by hand — is not fixed to a
// wall at all, and saying so is the honest answer rather than guessing from the nearest one.
export function cabinetOnWall(cabinet, faces) {
  const [x, , z] = cabinet.position;
  const half = (cabinet.width || 0) / 2;
  const alongX = Math.abs(Math.cos(cabinet.rotation || 0)) > .5;
  if (alongX && Math.abs(z) < 600) return {wall: WALLS.back, from: x - half, to: x + half};
  if (!alongX && Math.abs(x - faces.return.centre) < 600) return {wall: WALLS.return, from: z - half, to: z + half};
  return null;
}

// What is holding one cabinet up: the studs behind it, the nearest one to each end, and
// whether each end is close enough to timber to screw to. A stud half a width outside the
// span still counts — half of it is behind the cabinet.
export function assessCabinet({from, to}, studs, reach = CLEAT_REACH) {
  const inside = studs.filter(stud => stud >= from - STUD_WIDTH / 2 && stud <= to + STUD_WIDTH / 2);
  const nearestTo = end => inside.reduce((best, stud) => (best === null || Math.abs(stud - end) < Math.abs(best - end) ? stud : best), null);
  const ends = [['from', from], ['to', to]].map(([side, edge]) => {
    const screw = nearestTo(edge);
    return {side, at: round(edge), screw, off: screw === null ? null : round(Math.abs(edge - screw))};
  });
  const holding = ends.every(end => end.screw !== null && end.off <= reach);
  // The furthest a screw would have to travel in from an end to find timber. Null when
  // there is no timber behind the cabinet at all, which is a different problem again.
  const worst = Math.max(...ends.map(end => (end.off === null ? Infinity : end.off)));
  return {
    studs: inside.map(stud => round(stud)),
    ends,
    holding: holding ? 'studs' : 'cleat',
    worst: Number.isFinite(worst) ? round(worst) : null,
  };
}

// The whole picture: the walls and their timber, and every cabinet's fixing, from one call,
// so the panel's readout and the model cannot disagree about either.
export function framingPlan({cabinets = [], layout = 'l-shape', centres = DEFAULT_SPACING} = {}) {
  const faces = roomFaces(backWallWidth(cabinets));
  const walls = [{name: WALLS.back, ...faces.back, fixings: []}];
  if (layout === 'l-shape') walls.push({name: WALLS.return, ...faces.return, fixings: []});
  walls.forEach(wall => {
    wall.length = round(wall.to - wall.from);
    wall.studs = studsAlong(wall, centres);
    wall.centres = spacingOf(wall.length, centres);
  });

  const byName = Object.fromEntries(walls.map(wall => [wall.name, wall]));
  const onWalls = [];
  (cabinets || []).forEach(cabinet => {
    const placement = cabinetOnWall(cabinet, faces);
    if (!placement) return;
    // A cabinet can be against a wall this layout does not frame — a return run in a linear
    // layout, or a cabinet left standing where an L used to be. There is nothing to fix it to
    // on that wall, so it is reported as not on a wall at all rather than against no timber.
    const wall = byName[placement.wall];
    if (!wall) return;
    const assessment = assessCabinet(placement, wall.studs);
    onWalls.push({id: cabinet.id, name: cabinet.name, kind: cabinet.kind, wall: placement.wall,
      from: round(placement.from), to: round(placement.to), width: round(placement.to - placement.from),
      ...assessment});
    // Every stud behind the cabinet takes a screw; that is what the model draws.
    assessment.studs.forEach(at => wall.fixings.push({cabinetId: cabinet.id, at}));
  });

  return {
    centres,
    walls,
    cabinets: onWalls,
    studs: walls.reduce((total, wall) => total + wall.studs.length, 0),
    fixings: walls.reduce((total, wall) => total + wall.fixings.length, 0),
    cleats: onWalls.filter(record => record.holding === 'cleat').length,
  };
}

// One line of the readout, in the words a joiner would use rather than a triangle's.
export function fixingSummary(record) {
  if (!record) return 'Not against a wall';
  const count = record.studs.length;
  const studs = `${count} ${count === 1 ? 'stud' : 'studs'}`;
  if (!count) return 'Nothing behind it — a cleat or an anchor along the whole back';
  if (record.holding === 'studs') return `${studs} behind it, screwed at both ends`;
  return `${studs} behind it — ${formatMm(record.worst)} from an end. Cleat it.`;
}

export function formatMm(value) {
  return `${Math.round(value)} mm`;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
