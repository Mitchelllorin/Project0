"""Contract tests for the data-driven catalog engine (recipe.py).

These lock two things a configurator platform has to guarantee:
  1. the shipped catalog renders exactly the geometry it always has (golden), and
  2. a *different* manufacturer's catalog renders through the same engine with no
     code change — the onboarding path the product is sold on.
"""

import copy
import json

import pytest

import recipe

EURO = recipe.load_catalog('euro32')
NORTHLINE = recipe.load_catalog('northline-example')

# Part counts per reference configuration. Locks the geometry the engine produces.
GOLDEN_COUNTS = {('base', 762.0): 48, ('drawers', 762.0): 67, ('corner', 914.4): 22, ('corner-out', 914.4): 60}
FAMILIES = ['base', 'drawers', 'corner', 'corner-out']
PART_KEYS = {'id', 'name', 'category', 'position', 'size', 'assembly_axis', 'assembly_order',
             'parent_id', 'geometry', 'rotation', 'material', 'price', 'travel', 'machining', 'edges'}


def euro_json():
    with open(recipe.os.path.join(recipe.CATALOG_DIR, 'euro32.json'), encoding='utf-8') as handle:
        return json.load(handle)


def test_shipped_catalog_is_valid():
    assert recipe.validate_catalog(euro_json()) == []


def test_example_catalog_is_valid():
    """The onboarding example must itself pass the documented contract."""
    with open(recipe.os.path.join(recipe.CATALOG_DIR, 'northline-example.json'), encoding='utf-8') as handle:
        assert recipe.validate_catalog(json.load(handle)) == []


@pytest.mark.parametrize('kind,width', sorted(GOLDEN_COUNTS))
def test_golden_part_counts(kind, width):
    parts = recipe.build_parts(EURO, width, kind)
    assert len(parts) == GOLDEN_COUNTS[(kind, width)]


@pytest.mark.parametrize('catalog', [EURO, NORTHLINE], ids=['euro32', 'northline'])
@pytest.mark.parametrize('kind', FAMILIES)
def test_every_part_is_production_complete(catalog, kind):
    parts = recipe.build_parts(catalog, 762.0, kind)
    assert parts, f'{catalog.id}/{kind} produced no parts'
    ids = {p['id'] for p in parts}
    assert len(ids) == len(parts), 'duplicate part ids would break parent resolution'
    for part in parts:
        assert PART_KEYS <= set(part), f'{part["id"]} missing fields: {PART_KEYS - set(part)}'
        assert part['category'] in recipe.CATEGORY_ORDER
        assert part['assembly_order'] == recipe.CATEGORY_ORDER[part['category']]
        assert part['parent_id'] is None or part['parent_id'] in ids, f'{part["id"]} dangling parent'
        assert len(part['assembly_axis']) == 3 and any(abs(c) > 0 for c in part['assembly_axis'])
        assert part['travel'] == catalog.travel[part['category']]
        assert part['price'] >= 0


@pytest.mark.parametrize('kind', FAMILIES)
def test_second_catalog_renders_identically_shaped_geometry(kind):
    """Same constructs, different data: structure holds, dimensions/names follow the data."""
    euro = recipe.build_parts(EURO, 762.0, kind)
    other = recipe.build_parts(NORTHLINE, 762.0, kind)
    assert [p['id'] for p in other] == [p['id'] for p in euro]
    assert len(other) == len(euro)


def test_dimensions_and_branding_come_from_catalog_data():
    euro = recipe.build_parts(EURO, 762.0, 'base')
    other = recipe.build_parts(NORTHLINE, 762.0, 'base')
    euro_gable = next(p for p in euro if p['id'] == 'left')
    other_gable = next(p for p in other if p['id'] == 'left')
    # height − toe kick is the carcass side height, straight from the catalog
    assert euro_gable['size'][1] == pytest.approx(EURO.H - EURO.TOE)
    assert other_gable['size'][1] == pytest.approx(NORTHLINE.H - NORTHLINE.TOE)
    assert other_gable['size'][0] == pytest.approx(NORTHLINE.T)
    assert other_gable['name'] == 'Left carcass side'
    # hardware is named and priced by the catalog, not the engine
    hinge = next(p for p in other if p['category'] == 'hardware' and 'hinge' in p['id'])
    assert hinge['name'] == NORTHLINE.hardware['hinge']['name']
    assert hinge['price'] == NORTHLINE.hardware['hinge']['price']


def test_edge_banding_follows_declared_roles():
    parts = recipe.build_parts(NORTHLINE, 762.0, 'base')
    banded = {p['id']: p['edges'] for p in parts if p['category'] == 'panel'}
    door = next(p for p in parts if p['id'] == 'door-0')
    assert set(door['edges']) == {'front', 'handle', 'left', 'right'}
    assert door['edges']['front'] == {'material': 'PVC', 'thickness': 2.0}
    assert banded['back'] is None, 'a panel with no declared edges must not be banded'


def test_carcass_and_hinge_carry_machining():
    parts = recipe.build_parts(EURO, 762.0, 'base')
    gable = next(p for p in parts if p['id'] == 'left')
    assert gable['machining']['dado_width_mm'] == EURO.T
    assert gable['machining']['system_pitch_mm'] == EURO.joinery['system']['pitch']
    hinge = next(p for p in parts if p['id'] == 'hinge-0-0')
    assert hinge['machining']['cup_diameter_mm'] == pytest.approx(35.0)
    assert hinge['machining']['cup_depth_mm'] == EURO.hardware['hinge']['cup_depth']


def test_unknown_family_falls_back_to_base_construct():
    assert recipe.build_parts(EURO, 762.0, 'no-such-family') == recipe.build_parts(EURO, 762.0, 'base')


def test_validator_rejects_incomplete_catalog():
    errors = recipe.validate_catalog({'id': 'x'})
    assert 'missing required field: units' in errors
    assert 'missing required dimension: dimensions.height' in errors
    assert 'missing hardware: hinge' in errors


def test_validator_rejects_bad_units_and_unknown_construct():
    data = euro_json()
    data['units'] = 'furlong'
    data['families']['base']['construct'] = 'magic_joinery'
    errors = recipe.validate_catalog(data)
    assert any('units must be' in e for e in errors)
    assert any('unknown construct' in e for e in errors)


def test_validator_rejects_non_positive_dimension():
    data = euro_json()
    data['thickness']['carcass'] = 0
    assert any('thickness.carcass' in e for e in recipe.validate_catalog(data))


def test_build_parts_rejects_a_broken_catalog_spec():
    """Bypassing validation must fail loudly, not silently render nonsense."""
    broken = copy.deepcopy(NORTHLINE.data)
    broken['families']['base']['construct'] = 'magic_joinery'
    with pytest.raises(KeyError):
        recipe.build_parts(recipe.Catalog(broken), 762.0, 'base')
