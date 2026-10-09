"""Data-driven assembly engine (the rules layer).

Catalog *data* — what a manufacturer sells and makes — is kept separate from
this rules engine, which resolves a configuration into parts, hardware,
machining and price. Onboarding a manufacturer is therefore mostly data:
materials, thicknesses, hardware, joinery, pricing, edge-banding, labels and
product families live in a catalog document (see catalog/euro32.json and
CATALOG.md). A genuinely new construction method is added here once, as a named
construct, and referenced by any family.

Each part record carries what a production BOM needs: identity, parent assembly,
cut size, material, assembly vector/order, structured machining and edge-banding.
"""
from functools import lru_cache
from math import pi, sqrt
import json
import os

CATEGORY_ORDER = {'panel': 1, 'hardware': 2, 'fastener': 3}
CATALOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'catalog')


class Catalog:
    """A parsed manufacturer catalog. All dimensional truth comes from here."""

    def __init__(self, data):
        self.data = data
        self.id = data['id']
        self.name = data.get('name', data['id'])
        self.manufacturer = data.get('manufacturer', {})
        dims = data['dimensions']
        self.H = dims['height']
        self.D = dims['depth']
        self.TOE = dims['toe_kick']
        self.SHELF_Y = dims.get('shelf_height', 470.0)
        thick = data['thickness']
        self.T = thick['carcass']
        self.BACK = thick['back']
        self.DRAWER = thick.get('drawer', 12.0)
        self.joinery = data['joinery']
        self.hardware = data['hardware']
        self.labels = data.get('labels', {})
        self.pricing = data.get('pricing', {})
        self.travel = data.get('travel', {'panel': 330, 'hardware': 180, 'fastener': 170})
        self.edges = data.get('edges', {})
        self.edge_banding = data.get('edge_banding')
        self.families = data['families']

    def label(self, key, **kw):
        return self.labels.get(key, key).format(**kw)

    def family(self, kind):
        return self.families.get(kind) or self.families['base']


@lru_cache(maxsize=16)
def load_catalog(name='euro32'):
    with open(os.path.join(CATALOG_DIR, name + '.json'), encoding='utf-8') as handle:
        return Catalog(json.load(handle))


class Builder:
    def __init__(self, catalog):
        self.cat = catalog
        self.parts = []

    def add(self, pid, name, category, pos, size, axis, parent=None, geometry='box',
            rotation=None, material=None, price=None, machining=None, role=None):
        cat = self.cat
        mat = material or ('plywood' if category == 'panel' else 'steel')
        if price is None:
            if category == 'panel':
                price = max(size[0] * size[1], size[0] * size[2], size[1] * size[2]) / 1e6 * cat.pricing.get('panel_per_m2', 82)
            else:
                price = cat.pricing.get('hardware_default', 0.18)
        edges = None
        if category == 'panel' and cat.edge_banding and role in cat.edges and cat.edges[role]:
            edges = {face: dict(cat.edge_banding) for face in cat.edges[role]}
        self.parts.append(dict(
            id=pid, name=name, category=category, position=pos, size=size,
            assembly_axis=axis, assembly_order=CATEGORY_ORDER[category], parent_id=parent,
            geometry=geometry, rotation=rotation or [0, 0, 0], material=mat, price=round(price, 2),
            travel=cat.travel[category], machining=machining or {}, edges=edges,
        ))
        return pid

    def screw(self, pid, pos, axis, parent=None, length=17):
        key = 'screw_pozi' if length == 17 else 'screw_confirmat'
        hw = self.cat.hardware[key]
        return self.add(pid, hw['name'], 'fastener', pos, [4, length, 4], axis, parent, 'screw', price=hw.get('price', 0.18))


# ---------------------------------------------------------------- constructs

def _carcass(b, width):
    cat = b.cat
    T, BACK, H, D, TOE = cat.T, cat.BACK, cat.H, cat.D, cat.TOE
    for side, sign in [('left', -1), ('right', 1)]:
        b.add(side, cat.label('gable', side=side.title()), 'panel',
              [sign * (width - T) / 2, (H + TOE) / 2, 0], [T, H - TOE, D], [sign, 0, 0],
              geometry='gable', role='gable',
              machining={'dado_width_mm': T, 'dado_depth_mm': cat.joinery['dado']['depth'], 'dado_y_mm': T / 2,
                         'rabbet_width_mm': BACK, 'rabbet_depth_mm': cat.joinery['rabbet']['depth'],
                         'system_pitch_mm': cat.joinery['system']['pitch'],
                         'system_front_setback_mm': cat.joinery['system']['front_setback'],
                         'system_hole_diameter_mm': cat.joinery['system']['hole_diameter'], 'side': sign})
    b.add('bottom', cat.label('bottom'), 'panel', [0, TOE + T * 1.5, 0], [width - T, T, D - BACK], [0, -1, 0],
          role='bottom', machining={'joint': '19.05 × 9.525 mm dado'})
    b.add('back', cat.label('back'), 'panel', [0, (H + TOE) / 2, -D / 2 + BACK / 2], [width - T, H - TOE, BACK], [0, 0, -1],
          role='back', machining={'joint': '6.35 × 9.525 mm rabbet'})
    for idx, z in enumerate([-D / 2 + 55, D / 2 - 55]):
        b.add(f'rail-{idx}', cat.label('rail'), 'panel', [0, H - T / 2, z], [width - 2 * T, T, 90], [0, 1, 0], role='rail')
    b.add('toe', cat.label('toe'), 'panel', [0, TOE / 2, D / 2 - 75], [width - 2 * T, TOE, T], [0, 0, 1], role='toe')


def _carcass_fasteners(b, width):
    cat = b.cat
    T, H, D, TOE = cat.T, cat.H, cat.D, cat.TOE
    for side, sign in [('left', -1), ('right', 1)]:
        for j, y in enumerate([TOE + T * 1.5, H - T / 2]):
            for k, z in enumerate([-D / 2 + 55, D / 2 - 55]):
                b.screw(f'carcass-{side}-{j}-{k}', [sign * (width / 2 + 1), y, z], [sign, 0, 0], side, 50)
        for j, y in enumerate([cat.SHELF_Y - T / 2]):
            for k, z in enumerate([-D / 2 + 50, D / 2 - 37]):
                b.add(f'pin-{side}-{j}-{k}', cat.hardware['shelf_pin']['name'], 'fastener',
                      [sign * (width / 2 - T - 4), y, z], [5, 12, 5], [-sign, 0, 0], side, 'screw',
                      price=cat.hardware['shelf_pin']['price'])


def _overlay_doors(b, width):
    cat = b.cat
    T, H, D, TOE = cat.T, cat.H, cat.D, cat.TOE
    hw = cat.hardware
    b.add('shelf', cat.label('shelf'), 'panel', [0, cat.SHELF_Y, 8], [width - 2 * T - 2, T, D - 35], [0, 1, 0], role='shelf')
    for j, sign in enumerate([-1, 1]):
        b.add(f'door-{j}', cat.label('door'), 'panel', [sign * width / 4, (H + TOE) / 2, D / 2 + T / 2],
              [width / 2 - 3, H - TOE - 4, T], [0, 0, 1], geometry='door', material='finish', role='door')
        b.add(f'pull-{j}', hw['pull']['name'], 'hardware', [sign * 40, H - 115, D / 2 + 35], [10, 160, 28], [0, 0, 1],
              f'door-{j}', 'pull', material='hardware', price=hw['pull']['price'])
        for k, y in enumerate([H - 195, H - 35]):
            b.screw(f'pull-{j}-screw-{k}', [sign * 40, y, D / 2 + 7], [0, 0, -1], f'pull-{j}')
        for k, y in enumerate([TOE + 130, H - 130]):
            hid = f'hinge-{j}-{k}'
            b.add(hid, hw['hinge']['name'], 'hardware', [sign * (width / 2 - 23), y, D / 2 - 8], [35, 60, 35], [0, 0, -1],
                  f'door-{j}', 'hinge', price=hw['hinge']['price'],
                  machining={'cup_diameter_mm': hw['hinge']['cup_diameter'], 'cup_depth_mm': hw['hinge']['cup_depth'],
                             'system_pitch_mm': hw['hinge']['system_pitch'], 'front_setback_mm': hw['hinge']['front_setback']})
            for l, dy in enumerate([-16, 16]):
                b.screw(f'{hid}-cup-{l}', [sign * (width / 2 - 23), y + dy, D / 2 + 2], [0, 0, -1], hid)
                b.screw(f'{hid}-plate-{l}', [sign * (width / 2 - T - 3), y + dy, D / 2 - 37], [-sign, 0, 0], hid)


def _drawer_stack(b, width):
    cat = b.cat
    T, H, D, TOE = cat.T, cat.H, cat.D, cat.TOE
    hw = cat.hardware
    for j in range(3):
        y = TOE + (H - TOE) * (j + .5) / 3
        b.add(f'door-{j}', cat.label('drawer_front'), 'panel', [0, y, D / 2 + T / 2],
              [width - 3, (H - TOE) / 3 - 3, T], [0, 0, 1], geometry='door', material='finish', role='door')
        b.add(f'drawer-floor-{j}', cat.label('drawer_base'), 'panel', [0, y - 85, 10], [width - 85, 12, D - 80], [0, 0, 1],
              f'door-{j}', role='drawer')
        for side, sign in [('l', -1), ('r', 1)]:
            b.add(f'drawer-side-{j}-{side}', cat.label('drawer_side'), 'panel',
                  [sign * (width / 2 - 38), y - 30, 10], [12, 120, D - 80], [sign, 0, 0], f'drawer-floor-{j}', role='drawer')
            sid = f'slide-{j}-{side}'
            b.add(sid, hw['slide']['name'], 'hardware', [sign * (width / 2 - 42), y - 95, 0], [22, 24, 500], [sign, 0, 0],
                  side == 'l' and 'left' or 'right', 'slide', price=hw['slide']['price'])
            for k, z in enumerate([-200, 0, 200]):
                b.screw(f'{sid}-screw-{k}', [sign * (width / 2 - 24), y - 90, z], [sign, 0, 0], sid)
        b.add(f'drawer-back-{j}', cat.label('drawer_back'), 'panel', [0, y - 30, -D / 2 + 55], [width - 85, 120, 12],
              [0, 0, -1], f'drawer-floor-{j}', role='drawer')
        b.add(f'pull-{j}', hw['pull']['name'], 'hardware', [0, y + 65, D / 2 + 35], [160, 10, 28], [0, 0, 1],
              f'door-{j}', 'pull', material='hardware', price=hw['pull']['price'])
        for k, x in enumerate([-80, 80]):
            b.screw(f'pull-{j}-screw-{k}', [x, y + 65, D / 2 + 7], [0, 0, -1], f'pull-{j}')


def _outside_return(b, width):
    cat = b.cat
    T, H, D, TOE = cat.T, cat.H, cat.D, cat.TOE
    hw = cat.hardware
    side = 1
    door = 'door-side'
    b.add(door, cat.label('outside_door'), 'panel', [side * (width / 2 + T / 2), (H + TOE) / 2, 0],
          [D - 2, H - TOE - 4, T], [side, 0, 0], geometry='door', rotation=[0, side * pi / 2, 0], material='finish', role='door')
    b.add('pull-side', hw['pull']['name'], 'hardware', [side * (width / 2 + T / 2 + 35), H - 115, 0], [10, 160, 28],
          [side, 0, 0], door, 'pull', rotation=[0, side * pi / 2, 0], material='hardware', price=hw['pull']['price'])
    for k, y in enumerate([TOE + 130, H - 130]):
        hid = f'hinge-side-{k}'
        b.add(hid, hw['hinge']['name'], 'hardware', [side * (width / 2 - 8), y, 0], [35, 60, 35], [side, 0, 0], door, 'hinge',
              price=hw['hinge']['price'],
              machining={'cup_diameter_mm': hw['hinge']['cup_diameter'], 'cup_depth_mm': hw['hinge']['cup_depth'],
                         'system_pitch_mm': hw['hinge']['system_pitch']})
        for l, dy in enumerate([-16, 16]):
            b.screw(f'{hid}-cup-{l}', [side * (width / 2 + 2), y + dy, 0], [side, 0, 0], hid)
            b.screw(f'{hid}-plate-{l}', [side * (width / 2 - T - 3), y + dy, -37], [side, 0, 0], hid)


def _corner(b, width):
    cat = b.cat
    T, H, D, TOE = cat.T, cat.H, cat.D, cat.TOE
    hw = cat.hardware
    s = width
    poly = [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [s / 2 - D, s / 2], [-s / 2, -s / 2 + D]]
    b.add('bottom', cat.label('corner_bottom'), 'panel', [0, TOE + T / 2, 0], [s, T, s], [0, -1, 0], geometry='corner',
          role='bottom', machining={'polygon': poly, 'dado_width_mm': T, 'dado_depth_mm': cat.joinery['dado']['depth']})
    b.add('shelf', cat.label('corner_shelf'), 'panel', [0, 480, 0], [s - 2 * T, T, s - 2 * T], [0, 1, 0], geometry='corner',
          role='shelf', machining={'polygon': [[x * .95, z * .95] for x, z in poly]})
    b.add('back', cat.label('corner_back'), 'panel', [0, (H + TOE) / 2, -s / 2 + T / 2], [s, H - TOE, T], [0, 0, -1], role='back')
    b.add('right', cat.label('corner_right'), 'panel', [s / 2 - T / 2, (H + TOE) / 2, 0], [T, H - TOE, s - T], [1, 0, 0], role='gable')
    b.add('left', cat.label('corner_left'), 'panel', [-s / 2 + T / 2, (H + TOE) / 2, -s / 2 + D / 2], [T, H - TOE, D], [-1, 0, 0], role='gable')
    b.add('return', cat.label('corner_return'), 'panel', [s / 2 - D / 2, (H + TOE) / 2, s / 2 - T / 2], [D, H - TOE, T], [0, 0, 1], role='gable')
    door_pos = [-D / 2, (H + TOE) / 2, D / 2]
    b.add('door-1', cat.label('corner_door'), 'panel', door_pos, [sqrt(2) * (s - D) - 4, H - TOE - 4, T],
          [-.7071, 0, .7071], geometry='door', rotation=[0, -pi / 4, 0], material='finish', role='door')
    b.add('pull-1', cat.label('corner_pull'), 'hardware', [door_pos[0] - 20, H - 115, door_pos[2] + 20], [160, 10, 28],
          [-.7071, 0, .7071], 'door-1', 'pull', rotation=[0, -pi / 4, 0], material='hardware', price=hw['pull']['price'])
    for j, y in enumerate([TOE + 130, H - 130]):
        pos = [-s / 2 + 38, y, -s / 2 + D + 14]
        b.add(f'hinge-{j}', hw['hinge_wide']['name'], 'hardware', pos, [35, 60, 35], [0, 0, 1], 'door-1', 'hinge',
              price=hw['hinge_wide']['price'])
        for k, dy in enumerate([-16, 16]):
            b.screw(f'hinge-screw-{j}-{k}', [pos[0], y + dy, pos[2] + 14], [0, 0, 1], f'hinge-{j}')
    for side in ['left', 'right', 'back', 'return']:
        part = next(p for p in b.parts if p['id'] == side)
        for j, y in enumerate([TOE + T / 2, H - 35]):
            pos = list(part['position'])
            pos[1] = y
            b.screw(f'{side}-screw-{j}', pos, part['assembly_axis'], side, 50)
    return b.parts


def _frameless_base(b, width):
    _carcass(b, width)
    _overlay_doors(b, width)
    _carcass_fasteners(b, width)


def _frameless_drawers(b, width):
    _carcass(b, width)
    _drawer_stack(b, width)
    _carcass_fasteners(b, width)


def _frameless_base_with_return(b, width):
    _carcass(b, width)
    _overlay_doors(b, width)
    _outside_return(b, width)
    _carcass_fasteners(b, width)


CONSTRUCTS = {
    'frameless_base': _frameless_base,
    'frameless_drawers': _frameless_drawers,
    'frameless_corner': _corner,
    'frameless_base_with_return': _frameless_base_with_return,
}


REQUIRED_HARDWARE = ['hinge', 'hinge_wide', 'slide', 'pull', 'shelf_pin', 'screw_pozi', 'screw_confirmat']
_REQUIRED_NUMBERS = {
    'dimensions.height': ('dimensions', 'height'), 'dimensions.depth': ('dimensions', 'depth'),
    'dimensions.toe_kick': ('dimensions', 'toe_kick'),
    'thickness.carcass': ('thickness', 'carcass'), 'thickness.back': ('thickness', 'back'),
    'joinery.dado.width': ('joinery', 'dado', 'width'), 'joinery.dado.depth': ('joinery', 'dado', 'depth'),
    'joinery.rabbet.width': ('joinery', 'rabbet', 'width'), 'joinery.rabbet.depth': ('joinery', 'rabbet', 'depth'),
    'joinery.system.pitch': ('joinery', 'system', 'pitch'),
    'joinery.system.front_setback': ('joinery', 'system', 'front_setback'),
    'joinery.system.hole_diameter': ('joinery', 'system', 'hole_diameter'),
    'travel.panel': ('travel', 'panel'), 'travel.hardware': ('travel', 'hardware'), 'travel.fastener': ('travel', 'fastener'),
}


def _dig(data, path):
    cur = data
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return None, False
        cur = cur[key]
    return cur, True


def validate_catalog(data):
    """Return a list of onboarding errors, empty when the catalog is renderable.

    This is the contract a manufacturer's data has to satisfy to drop in: it is
    deliberately explicit and machine-checkable so onboarding is a data-mapping
    exercise rather than a code change.
    """
    errors = []
    if not isinstance(data, dict):
        return ['catalog must be a JSON object']
    for field in ('id', 'units', 'families', 'hardware', 'labels'):
        if not data.get(field):
            errors.append(f'missing required field: {field}')
    for label, path in _REQUIRED_NUMBERS.items():
        value, present = _dig(data, path)
        if not present:
            errors.append(f'missing required dimension: {label}')
        elif not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
            errors.append(f'{label} must be a positive number (got {value!r})')
    for key in REQUIRED_HARDWARE:
        item, present = _dig(data, ('hardware', key))
        if not present:
            errors.append(f'missing hardware: {key}')
        elif not item.get('name'):
            errors.append(f'hardware {key} needs a name')
    families = data.get('families') or {}
    if 'base' not in families:
        errors.append("families must include a 'base' family")
    for kind, family in families.items():
        construct = family.get('construct')
        if not construct:
            errors.append(f'family {kind} needs a construct')
        elif construct not in CONSTRUCTS:
            errors.append(f'family {kind} references unknown construct {construct!r} '
                          f'(available: {sorted(CONSTRUCTS)})')
    if data.get('units') and data['units'] not in ('mm', 'inch'):
        errors.append(f"units must be 'mm' or 'inch' (got {data['units']!r})")
    return errors


def available_catalogs():
    """Every catalog document shipped in catalog/, with its onboarding status."""
    if not os.path.isdir(CATALOG_DIR):
        return []
    out = []
    for filename in sorted(os.listdir(CATALOG_DIR)):
        if not filename.endswith('.json'):
            continue
        try:
            with open(os.path.join(CATALOG_DIR, filename), encoding='utf-8') as handle:
                data = json.load(handle)
        except (OSError, ValueError) as exc:
            out.append(dict(name=filename[:-5], id=filename[:-5], display_name=filename[:-5],
                            valid=False, errors=[f'unreadable catalog: {exc}']))
            continue
        errors = validate_catalog(data)
        out.append(dict(name=filename[:-5], id=data.get('id', filename[:-5]),
                        display_name=data.get('name', filename[:-5]),
                        manufacturer=(data.get('manufacturer') or {}).get('name', ''),
                        units=data.get('units', ''), families=sorted((data.get('families') or {}).keys()),
                        valid=not errors, errors=errors))
    return out


def build_parts(catalog, width=762.0, kind='base'):
    """Resolve one cabinet instance into parts using the catalog's family construct."""
    family = catalog.family(kind)
    construct = CONSTRUCTS.get(family['construct'])
    if construct is None:
        raise KeyError(f"Unknown construct {family['construct']!r} for family {kind!r}")
    builder = Builder(catalog)
    construct(builder, width)
    return builder.parts
