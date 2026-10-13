"""One cabinet, re-cut as each thing it could be, at each size it could be.

A custom layout sells on one sentence: say what the cabinet is and how big, and it comes
back with the panels, the hardware and the price for that. These tests hold the engine to
that sentence, because it is the whole product — a configurator that only moves boxes
around is a floor planner, and every one of those already exists.
"""

import pytest
from pydantic import ValidationError

import layout
from models import Configuration, Placement

CATALOGS = ['euro32', 'northline-example']
KINDS = ['base', 'drawers', 'corner-out', 'corner']


def build(kind='base', width=762.0, catalog='euro32'):
    cat = layout.load_catalog(catalog)
    config = Configuration(catalog=catalog, custom=True,
                           placements=[Placement(id='N01', kind=kind, width=width, x=0, z=304.8, rotation=0)])
    cabinets = layout.build_layout(config, cat)
    return cat, cabinets[0], layout.make_quote(cabinets, config)


def named(cabinet, name):
    return [p for p in cabinet['parts'] if p['name'] == name]


def panels(cabinet):
    return [p for p in cabinet['parts'] if p['category'] == 'panel']


def hardware(cabinet):
    return [p for p in cabinet['parts'] if p['category'] == 'hardware']


def panel_sizes(cabinet):
    return sorted(tuple(round(n, 1) for n in p['size']) for p in panels(cabinet))


def test_every_kind_the_widget_offers_is_a_cabinet_the_engine_will_build():
    for kind in KINDS:
        _, cabinet, _ = build(kind=kind)
        assert cabinet['parts'], kind
        assert cabinet['kind'] == kind


def test_a_door_unit_and_a_drawer_unit_are_not_the_same_cabinet():
    cat, doors, _ = build('base')
    _, drawers, _ = build('drawers')
    assert len(named(doors, cat.label('door'))) == 2
    assert len(named(doors, cat.label('drawer_front'))) == 0
    assert len(named(drawers, cat.label('drawer_front'))) == 3
    assert len(named(drawers, cat.label('door'))) == 0
    # Three drawers, two runners each, against two doors, two hinges each.
    assert len(named(drawers, cat.hardware['slide']['name'])) == 6
    assert len(named(doors, cat.hardware['slide']['name'])) == 0
    assert len(named(doors, cat.hardware['hinge']['name'])) == 4


def test_an_outside_corner_carries_a_return_that_a_plain_base_does_not():
    cat, plain, _ = build('base')
    _, returned, _ = build('corner-out')
    assert len(named(returned, cat.label('outside_door'))) == 1
    assert len(named(plain, cat.label('outside_door'))) == 0
    assert len(returned['parts']) > len(plain['parts'])


def test_a_diagonal_corner_is_its_own_carcass():
    _, corner, _ = build('corner')
    assert [p for p in panels(corner) if p.get('geometry') == 'corner']
    # The diagonal face is one wide door across the whole corner, not a pair.
    assert len([p for p in panels(corner) if p.get('geometry') == 'door']) == 1


def test_each_kind_is_its_own_cut_list_and_its_own_price():
    sizes, totals = {}, {}
    for kind in KINDS:
        _, cabinet, quote = build(kind=kind)
        sizes[kind] = tuple(panel_sizes(cabinet))
        totals[kind] = quote['total']
    assert len(set(sizes.values())) == len(KINDS)
    assert len(set(totals.values())) == len(KINDS)


def test_the_same_cabinet_at_two_sizes_is_two_cut_lists():
    cat, small, small_quote = build('base', 457.2)
    _, large, large_quote = build('base', 1219.2)
    assert panel_sizes(small) != panel_sizes(large)
    assert large_quote['total'] > small_quote['total']
    # The bottom spans the carcass less one gable, at whatever size was asked for.
    bottom = named(large, cat.label('bottom'))[0]
    assert bottom['size'][0] == pytest.approx(1219.2 - cat.T, abs=0.05)


def test_a_size_off_the_stock_grid_is_still_built():
    # "Whatever size I want" has to mean it: 800 mm is not a stock inch and it is not
    # 3-inch stepped, which is all the *presets* are limited to.
    cat, cabinet, _ = build('base', 800.0)
    assert named(cabinet, cat.label('bottom'))[0]['size'][0] == pytest.approx(800 - cat.T, abs=0.05)


def test_a_size_no_catalog_will_build_is_refused_rather_than_clamped():
    with pytest.raises(ValidationError):
        Placement(id='N01', kind='base', width=200, x=0, z=0, rotation=0)
    with pytest.raises(ValidationError):
        Placement(id='N01', kind='base', width=2000, x=0, z=0, rotation=0)


def test_a_kind_no_catalog_builds_is_refused():
    with pytest.raises(ValidationError):
        Placement(id='N01', kind='tall-larder', width=762, x=0, z=0, rotation=0)


@pytest.mark.parametrize('catalog', CATALOGS)
def test_every_kind_morphs_through_any_manufacturers_catalog(catalog):
    cat = layout.load_catalog(catalog)
    for kind in KINDS:
        _, cabinet, _ = build(kind=kind, catalog=catalog)
        assert cabinet['parts']
        assert cabinet['name'] == cat.family(kind)['name']
