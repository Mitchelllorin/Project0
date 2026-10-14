import React,{useMemo} from 'react';
import {Box} from './PartGeometry';
import {CLEAT_REACH,PLATE,STUD_DEPTH,STUD_WIDTH,WALL_HEIGHT,framingPlan} from './studs';

// The framing behind the kitchen: the layer that makes a run of cabinets look as though it
// is fixed to nothing at all. Room3D ghosts the drywall, the tiling and the splashback while
// this is drawn, so what is left is the timber and the screws going into it.
//
// The grammar is one colour. A stud carrying a cabinet is green; the rest are timber. And a
// cabinet end with no timber within reach gets an amber marker, because that end cannot be
// screwed to the wall at all — it needs a cleat or a rated anchor instead, which is the one
// thing about a finished kitchen that cannot be seen and is the whole reason to draw this.
const M = 1000;
const RAIL_Y = .62;        // where a base cabinet's back rail sits: the height screws go in
const SCREW_LENGTH = 80;   // mm — from the back of a cabinet, through the drywall, into timber
const SCREW_RADIUS = 4;    // mm
const CLEAT = 88;          // mm — the marker left where an end has no timber to fix to

const TIMBER = {color:'#c69a63', roughness:.9, metalness:.02};
const LOADED = {color:'#8fb071', roughness:.8, metalness:.02};
const SCREW = {color:'#d9d5c9', metalness:.85, roughness:.22};
const MARKER = {color:'#e0913f', emissive:'#6b3c0c', emissiveIntensity:.4, roughness:.5};

// The finished face of a wall: half a stud in from its centre plane, toward the room.
function faceOf(wall) {
  return wall.centre + wall.inward * (STUD_DEPTH / 2);
}

// A wall runs along one axis and everything on it is a box that follows: `along` is where it
// sits along the wall, `centre` how deep into the wall it sits. Writing that once is what
// lets the return wall be framed without a second copy of the geometry.
function bar(wall, {along, length, height, depth, y = WALL_HEIGHT / 2, centre = wall.centre}) {
  return wall.axis === 'x'
    ? {size: [length / M, height / M, depth / M], position: [along / M, y / M, centre / M]}
    : {size: [depth / M, height / M, length / M], position: [centre / M, y / M, along / M]};
}

function Plates({wall}) {
  const middle = (wall.to + wall.from) / 2;
  return <>{[PLATE / 2, WALL_HEIGHT - PLATE / 2].map(y => {
    const {size, position} = bar(wall, {along: middle, length: wall.to - wall.from, height: PLATE, depth: STUD_DEPTH, y});
    return <Box key={y} size={size} position={position} material={TIMBER}/>;
  })}</>;
}

// A screw from the back of a cabinet, through the ghosted drywall, into the stud holding it.
// Placed proud of the wall's face so it sits in the gap a cabinet stands off in.
function Screw({wall, at}) {
  const perpendicular = (faceOf(wall) + wall.inward * (SCREW_LENGTH / 5)) / M;
  const position = wall.axis === 'x' ? [at / M, RAIL_Y, perpendicular] : [perpendicular, RAIL_Y, at / M];
  const rotation = wall.axis === 'x' ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2];
  return <mesh position={position} rotation={rotation}>
    <cylinderGeometry args={[SCREW_RADIUS / M, SCREW_RADIUS / M, SCREW_LENGTH / M, 10]}/>
    <meshStandardMaterial {...SCREW}/>
  </mesh>;
}

export function StudWall({cabinets = [], layout = 'l-shape', centres}) {
  const plan = useMemo(() => framingPlan({cabinets, layout, centres}), [cabinets, layout, centres]);
  const walls = useMemo(() => Object.fromEntries(plan.walls.map(wall => [wall.name, wall])), [plan]);
  // Every cabinet end with no timber within reach of it: the cleats this run would need.
  const cleats = plan.cabinets.flatMap(record => record.holding === 'cleat'
    ? record.ends.filter(end => end.off === null || end.off > CLEAT_REACH)
      .map(end => ({key: `${record.id}-${end.side}`, wall: record.wall, at: end.at}))
    : []);
  return <group name="wall-framing">
    {plan.walls.map(wall => {
      const loaded = new Set(wall.fixings.map(fixing => fixing.at));
      return <group key={wall.name} name={`wall-${wall.name}`}>
        <Plates wall={wall}/>
        {wall.studs.map(at => {
          const {size, position} = bar(wall, {along: at, length: STUD_WIDTH, height: WALL_HEIGHT, depth: STUD_DEPTH});
          return <Box key={at} size={size} position={position} material={loaded.has(at) ? LOADED : TIMBER}/>;
        })}
        {wall.fixings.map(fixing => <Screw key={`${fixing.cabinetId}-${fixing.at}`} wall={wall} at={fixing.at}/>)}
      </group>;
    })}
    {cleats.map(marker => {
      const wall = walls[marker.wall];
      if (!wall) return null;
      // Sat in front of the wall's face, where the cabinet's end is, so it reads as
      // "something has to go here" rather than as part of the framing.
      const {size, position} = bar(wall, {along: marker.at, length: CLEAT, height: CLEAT, depth: 24,
        y: RAIL_Y * M, centre: faceOf(wall) + wall.inward * 14});
      return <Box key={marker.key} size={size} position={position} material={MARKER}/>;
    })}
  </group>;
}
