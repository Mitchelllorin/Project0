// The framing behind the kitchen, and what each cabinet is actually fixed to.
//
// The cabinets below are not invented: they are what the API answers to a POST of the
// studio's own default configuration (`/api/configure`, layout l-shape, every other field
// at its default), so the numbers asserted here are the numbers the studio draws.
import {assessCabinet, backWallWidth, cabinetOnWall, DEFAULT_SPACING, fixingSummary,
  formatMm, framingPlan, roomFaces, spacingOf, SPACINGS, STUD_WIDTH, studsAlong, studsFor} from './studs';

const cabinet = (id, kind, width, x, z, rotation = 0, name = 'Base') =>
  ({id, name, kind, width, depth: 609.6, height: 876.3, position: [x, 0, z], rotation});

const KITCHEN = [
  cabinet('B01', 'drawers', 762, 381, 304.8, 0, 'Drawer base'),
  cabinet('B02', 'base', 914.4, 1219.2, 304.8, 0, 'Sink base'),
  cabinet('B03', 'base', 762, 2057.4, 304.8, 0, 'Double-door base'),
  cabinet('C01', 'corner', 914.4, 2895.6, 457.2, 0, 'Diagonal corner'),
  cabinet('B04', 'base', 762, 3048, 1295.4, -Math.PI / 2, 'Return base'),
  cabinet('B05', 'base', 762, 3048, 2057.4, -Math.PI / 2, 'Return base'),
  cabinet('I01', 'base', 762, 550, 2050, 0, 'Island base'),
  cabinet('I02', 'base', 762, 1312, 2050, 0, 'Island base'),
];

const record = (plan, id) => plan.cabinets.find(entry => entry.id === id);

describe('the studs in a wall', () => {
  it('is a corner stud at each end, however long the wall', () => {
    [500, 1200, 2400, 3048, 4002.8, 6000].forEach(length => {
      const studs = studsFor(length, DEFAULT_SPACING);
      expect(studs[0]).toBe(0);
      expect(studs[studs.length - 1]).toBeCloseTo(length, 6);
    });
  });

  // The one property that matters: no bay is wider than the centres asked for, so there is
  // always timber within reach of a screw. Where the wall is not a whole number of bays the
  // bays come out slightly narrower, and the centres that were achieved are reported.
  it('never leaves a bay wider than the centres asked for', () => {
    SPACINGS.forEach(centres => {
      for (let length = 300; length <= 6400; length += 137) {
        const studs = studsFor(length, centres);
        expect(studs.length).toBeGreaterThanOrEqual(2);
        for (let index = 1; index < studs.length; index += 1) {
          expect(studs[index] - studs[index - 1]).toBeLessThanOrEqual(centres + 1e-6);
        }
        expect(spacingOf(length, centres)).toBeLessThanOrEqual(centres);
      }
    });
  });

  it('frames a wall that is a whole number of bays at exactly those centres', () => {
    expect(studsFor(2400, 600)).toEqual([0, 600, 1200, 1800, 2400]);
    expect(spacingOf(2400, 600)).toBe(600);
  });

  it('narrows the bays rather than crowding two studs into the last one', () => {
    // 3048 mm at 600 centres is 5.08 bays. Six bays of 508 beat five of 600 plus a stub.
    expect(studsFor(3048, 600)).toEqual([0, 508, 1016, 1524, 2032, 2540, 3048]);
    expect(spacingOf(3048, 600)).toBe(508);
  });

  it('has nothing to say about a wall that is not there', () => {
    expect(studsFor(0, 600)).toEqual([]);
    expect(studsFor(-1200, 600)).toEqual([]);
    expect(studsFor(2400, 0)).toEqual([]);
  });

  it('places them in the room, not just along the wall', () => {
    const face = roomFaces(3.3528).back;
    expect(face.from).toBe(-475);
    expect(face.to).toBeCloseTo(3527.8, 6);
    const studs = studsAlong(face, 600);
    expect(studs[0]).toBe(-475);
    expect(studs[studs.length - 1]).toBeCloseTo(3527.8, 6);
    expect(studs.length).toBe(8);
  });
});

describe('what is holding a cabinet up', () => {
  it('counts a stud inside the cabinet, and not one beside it', () => {
    const studs = [0, 600, 1200, 1800];
    const holding = assessCabinet({from: 0, to: 762}, studs);
    expect(holding.studs).toEqual([0, 600]);
    expect(holding.holding).toBe('studs');
    // A rear corner within reach of both ends: 96 and 162 mm in, both inside the 250 mm
    // a screw may travel in from an end.
    expect(holding.ends.map(end => end.off)).toEqual([0, 162]);
  });

  it('counts a stud half outside the cabinet, because half of it is still behind it', () => {
    const holding = assessCabinet({from: STUD_WIDTH / 2, to: 900}, [0]);
    expect(holding.studs).toEqual([0]);
  });

  // The finding this whole module exists for: one stud behind a 914 mm sink base leaves
  // each end nearly half a metre from timber, and that end cannot be screwed to the wall.
  it('says a cabinet needs a cleat when an end is out of reach of any stud', () => {
    const holding = assessCabinet({from: 762, to: 1676.4}, [96.83, 668.66, 1240.49, 1812.31]);
    expect(holding.studs).toEqual([1240.49]);
    expect(holding.holding).toBe('cleat');
    expect(holding.worst).toBeCloseTo(478.49, 2);
  });

  it('says so plainly when there is no stud behind the cabinet at all', () => {
    const holding = assessCabinet({from: 1000, to: 1700}, [0, 600, 6000]);
    expect(holding.studs).toEqual([]);
    expect(holding.holding).toBe('cleat');
    expect(holding.worst).toBeNull();
    expect(fixingSummary(holding)).toBe('Nothing behind it — a cleat or an anchor along the whole back');
  });

  it('reads out in a joiner\u2019s words, not a triangle\u2019s', () => {
    const holding = assessCabinet({from: 0, to: 762}, [96.83, 668.66, 1240.49]);
    expect(fixingSummary(holding)).toBe('2 studs behind it, screwed at both ends');
    expect(fixingSummary(assessCabinet({from: 762, to: 1676.4}, [1240.49]))).toContain('Cleat it.');
  });

  it('still answers when it is handed nothing', () => {
    expect(fixingSummary(null)).toBe('Not against a wall');
    expect(formatMm(478.49)).toBe('478 mm');
  });
});

describe('the framing behind the studio\u2019s own kitchen', () => {
  const plan = framingPlan({cabinets: KITCHEN});

  it('measures the back wall from the cabinets standing against it', () => {
    expect(backWallWidth(KITCHEN)).toBe(3.3528);
  });

  it('frames both walls of an L, and only the back wall of a line', () => {
    expect(plan.walls.map(wall => wall.name)).toEqual(['back', 'return']);
    expect(framingPlan({cabinets: KITCHEN, layout: 'straight'}).walls.map(wall => wall.name)).toEqual(['back']);
  });

  it('frames both walls at no more than 600 centres, and says what it achieved', () => {
    plan.walls.forEach(wall => {
      expect(wall.studs[wall.studs.length - 1] - wall.studs[0]).toBeCloseTo(wall.length, 4);
      expect(wall.centres).toBeLessThanOrEqual(600);
    });
    expect(plan.walls[0].centres).toBeCloseTo(571.83, 2);
    expect(plan.walls[0].studs).toHaveLength(8);
    expect(plan.walls[1].centres).toBe(560);
    expect(plan.walls[1].studs).toHaveLength(6);
    expect(plan.studs).toBe(14);
  });

  it('ties every wall cabinet to the wall it stands against, and neither island to any', () => {
    expect(plan.cabinets.map(entry => entry.id)).toEqual(['B01', 'B02', 'B03', 'C01', 'B04', 'B05']);
    expect(record(plan, 'B04').wall).toBe('return');
    expect(cabinetOnWall(KITCHEN[6], roomFaces(3.3528))).toBeNull();
  });

  // Three of the six are fine and three are not, which is the point of drawing it: the
  // answer is not "the kitchen is on studs" or "it is not", it is per cabinet.
  it('finds the three cabinets in this run that would need a cleat', () => {
    expect(plan.cleats).toBe(3);
    expect(['B02', 'C01', 'B05']).toEqual(plan.cabinets.filter(entry => entry.holding === 'cleat').map(entry => entry.id));
    expect(record(plan, 'B01').holding).toBe('studs');
    expect(record(plan, 'B04').holding).toBe('studs');
  });

  it('puts one fixing in every stud a cabinet covers, and none in the gaps', () => {
    expect(plan.fixings).toBe(9);
    expect(plan.walls[0].fixings).toHaveLength(6);
    expect(plan.walls[1].fixings).toHaveLength(3);
    // A stud is a fixing for exactly one cabinet, and only for a cabinet it is behind.
    plan.walls.forEach(wall => wall.fixings.forEach(fixing => {
      const owner = record(plan, fixing.cabinetId);
      expect(owner).toBeDefined();
      expect(owner.wall).toBe(wall.name);
      expect(owner.studs).toContain(fixing.at);
    }));
  });

  it('does not fix a cabinet to a wall this layout does not build', () => {
    // A linear layout has no return, so the two cabinets that stood on one are against no
    // framed wall. They are left out rather than reported against no timber.
    const straight = framingPlan({cabinets: KITCHEN, layout: 'straight'});
    expect(straight.cabinets.map(entry => entry.id)).toEqual(['B01', 'B02', 'B03', 'C01']);
    expect(straight.fixings).toBe(6);
  });

  it('frames a kitchen with no cabinets at all', () => {
    const empty = framingPlan({cabinets: []});
    expect(empty.cabinets).toEqual([]);
    expect(empty.fixings).toBe(0);
    expect(empty.studs).toBeGreaterThan(0);
  });
});
