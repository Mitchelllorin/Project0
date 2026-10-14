// Which cabinets come apart, and by how much.
//
// The explode is drawn in two places and it does not mean the same thing in
// either. The assembly explorer has one selection and nothing else on screen, so
// everything it is showing comes apart. The workspace is the whole kitchen, so
// only the cabinets in focus do — the run, the room and every neighbouring
// carcass stay standing, which is the entire point of exploding there: you are
// deciding how big the thing in hand should be, and that question only has an
// answer next to the things it has to fit between.
//
// Kept out of the scene because a cabinet's explode amount is the difference
// between the two views, and the scene cannot be rendered under jsdom.
export function explodeScope({cabinets, selected, assembly}) {
  return assembly ? cabinets : cabinets.filter(cabinet => selected.includes(cabinet.id));
}

export function explodeAmount(cabinetId, {selected, assembly, explode}) {
  return assembly || selected.includes(cabinetId) ? explode : 0;
}
