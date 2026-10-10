// Doors and drawers open on their own for the cabinet you are looking at, so
// peeking inside never needs a trip to the toolbar toggle. Three guards:
//   - the global toggle still opens every cabinet;
//   - the assembly view is excluded, because its panels are already exploded
//     apart and swinging them there fights the explode;
//   - the cabinet selected on first load was chosen by nobody, so the studio
//     still opens on a closed kitchen rather than one hanging open.
export function doorsOpenFor(
  id: string,
  {doorsOpen = false, selected = [], assembly = false, picked = false}: {
    doorsOpen?: boolean; selected?: string[]; assembly?: boolean; picked?: boolean;
  } = {},
): boolean {
  if (doorsOpen) return true;
  if (assembly || !picked) return false;
  return (selected || []).includes(id);
}

// Turning the toolbar toggle off has to close every door, including the selected
// cabinet's, or the button lies about what it just did. Clearing the "picked"
// flag is what makes the next selection open itself again.
export function pickedAfterToggle(doorsOpen: boolean, picked: boolean): boolean {
  return doorsOpen ? false : picked;
}
