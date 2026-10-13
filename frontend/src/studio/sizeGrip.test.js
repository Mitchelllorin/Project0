// Pulling the end of a cabinet has three things that are easy to get wrong and
// invisible in jsdom, so they are asserted against the real source: the room must not
// orbit while you pull, the pointer must be measured against the cabinet's current pose
// rather than its previous one, and a diagonal corner must not be pullable at all.
//
// The last test here is the one that answers the actual complaint: layout lived in three
// places at once and cabinet widths were offered in two of them. That is now a failing
// test rather than a thing someone has to notice.
import fs from 'fs';
import path from 'path';
import {SIZE_SNAP_MM, stretchable, stretchedWidth} from './layoutWidget';

const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const viewport = read('Viewport.jsx');
const widget = read('LayoutWidget.jsx');
const controls = read('Controls.jsx');

describe('the size grip on the model', () => {
  it('turns the orbit off while pulling, or the room spins as the cabinet stretches', () => {
    expect(viewport).toMatch(/controls\.enabled=false/);
    expect(viewport).toMatch(/if\(controls\)controls\.enabled=true/);
  });

  it('measures the pointer against the current pose, not the one that was last painted', () => {
    expect(viewport).toMatch(/frame\.current\.updateWorldMatrix\(true,false\)/);
    expect(viewport).toMatch(/frame\.current\.worldToLocal\(hit\.clone\(\)\)/);
  });

  it('anchors to the cabinet it is pulling, and is offered on both ends', () => {
    expect(viewport).toMatch(/\{\[1,-1\]\.map\(side=><SizeGrip/);
    expect(viewport).toMatch(/stretchable\(c\.kind\)&&<group/);
  });

  it('only writes one undo step per pull, however many frames it took', () => {
    // The frame-by-frame writes go through the live path; the release is the recorded one.
    expect(viewport).toMatch(/onResize\(cabinet\.id,width,x,z,true\)/);
    expect(viewport).toMatch(/onResize\(cabinet\.id,pull\.current\.width,pull\.current\.x,pull\.current\.z,false\)/);
  });

  it('snaps the pull to the inch, so nothing lands on a 743 mm carcass', () => {
    for (const localX of [123, 456.7, 700.13, 999]) {
      const {width} = stretchedWidth({width: 762, localX, side: 1});
      // A whole number of inches, not a modulo: 127 % 25.4 is 25.3999999 in binary.
      expect(width / SIZE_SNAP_MM).toBeCloseTo(Math.round(width / SIZE_SNAP_MM), 6);
    }
  });

  it('leaves a diagonal corner out of it', () => {
    expect(stretchable('corner')).toBe(false);
  });
});

describe('tapping a cabinet in the model', () => {
  it('is what opens the layout card', () => {
    expect(viewport).toMatch(/onSelect:id=>\{selectCabinet\(id\);if\(!assembly\)setArrange\(true\);\}/);
  });

  it('shows the card without a second click to summon it', () => {
    expect(widget).toMatch(/const panel=usePanel\(true\)/);
    expect(widget).not.toMatch(/const panel=usePanel\(false\)/);
  });
});

describe('one section for layout, not three', () => {
  it('offers cabinet widths in the layout card and nowhere else', () => {
    // The left panel used to carry its own eleven stock sizes for every cabinet, the same
    // eleven the card offered — two places to ask one question, and no way to tell which
    // answered. Sizing belongs with positioning.
    expect(controls).not.toMatch(/data-testid=\{`width-\$\{c\.id\}`\}/);
    expect(controls).toMatch(/Widths, position and merging belong to the layout card/);
    expect(widget).toMatch(/data-testid="cabinet-width"/);
  });

  it('keeps the whole-kitchen plan in the left panel, where choosing a plan belongs', () => {
    expect(controls).toMatch(/data-testid=\{`layout-\$\{value\}`\}/);
    expect(controls).toMatch(/<Toggle id="island-toggle"/);
  });
});
