"""What a merge actually changes, and — mostly — what it must not.

Two base units butted together carry four machined gables at the joint: the right
gable of the left unit and the left gable of the right unit, bolted face to face. A
shop building those two bays as one run deletes both and stands a shared partition
between them. That is the whole of the saving, in panels and in carcasses to
assemble, and it is what the quote used to ignore — merging two cabinets changed
the price by exactly nothing.

These are written against the parts rather than the totals because the interesting
failure here is silent. The first version of this matched a gable's children by
`parent_id`, and a drawer runner is parented to a gable too: merging a drawer bank
quietly deleted three of its slides. Only a name-by-name diff caught it.
"""

import collections

import pytest

import layout
import recipe
from models import Configuration

CATALOGS = ['euro32', 'northline-example']


def build(catalog='euro32', **overrides):
    config = Configuration(catalog=catalog, **overrides)
    return config, layout.build_layout(config, layout.load_catalog(catalog))


def names(units):
    return collections.Counter(p['name'] for c in units for p in c['parts'])


def tally(units):
    return collections.Counter(p['category'] for c in units for p in c['parts'])


def gables(units, cabinet_id):
    for cabinet in units:
        if cabinet['id'] == cabinet_id:
            return [p['id'] for p in cabinet['parts'] if p.get('geometry') == 'gable']
    raise KeyError(cabinet_id)


# --------------------------------------------------------- nothing changes by default
def test_a_configuration_with_no_runs_is_untouched():
    config, cabinets = build()
    before = [list(c['parts']) for c in cabinets]
    reports, joints = layout.apply_runs(cabinets, config.groups, layout.load_catalog('euro32'))
    assert reports == []
    assert joints == 0
    assert [c['parts'] for c in cabinets] == before


def test_the_ungrouped_default_still_prices_and_cuts_the_same():
    # The reference numbers the rest of the suite is built on, restated here so a
    # change to the run engine that leaks into an ungrouped job fails loudly.
    config, cabinets = build()
    assert len(cabinets) == 8
    assert tally(cabinets) == {'panel': 89, 'hardware': 48, 'fastener': 240}
    assert layout.make_quote(cabinets, config)['total'] == 6399.08


# ------------------------------------------------------------------ the joint itself
def test_a_merge_removes_one_gable_each_side_and_stands_one_partition():
    config, cabinets = build()
    before = names(cabinets)
    reports, joints = layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    after = names(cabinets)
    assert joints == 1
    assert reports[0]['fused'] is True
    assert after['Left machined gable'] == before['Left machined gable'] - 1
    assert after['Right machined gable'] == before['Right machined gable'] - 1
    assert after['Shared run partition'] == 1


def test_a_merge_moves_nothing_else_in_the_cut_list():
    config, cabinets = build()
    before = names(cabinets)
    layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    after = names(cabinets)
    changed = {name: (before[name], after[name]) for name in set(before) | set(after)
               if before.get(name, 0) != after.get(name, 0)}
    assert set(changed) == {'Left machined gable', 'Right machined gable', 'Shared run partition'}


def test_a_partition_carries_the_same_fixings_the_two_gables_did():
    config, cabinets = build()
    before = tally(cabinets)
    layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    after = tally(cabinets)
    # Two gables' worth of confirmats and pins out, one partition's worth in.
    assert after['fastener'] == before['fastener']
    assert after['panel'] == before['panel'] - 1


def test_a_partition_carries_pins_on_both_faces():
    cat = layout.load_catalog('euro32')
    config, cabinets = build()
    layout.apply_runs(cabinets, [['B01', 'B02']], cat)
    fixings = [p['id'] for p in next(c for c in cabinets if c['id'] == 'B01')['parts']
               if p['id'].startswith('joint-0-pin-')]
    assert sorted(fixings) == ['joint-0-pin--1-0', 'joint-0-pin--1-1', 'joint-0-pin-1-0', 'joint-0-pin-1-1']


def test_a_partition_sits_midway_between_the_two_gables_it_replaces():
    cat = layout.load_catalog('euro32')
    config, cabinets = build()
    thickness = cat.T
    right_of_b01 = next(p for p in cabinets[0]['parts'] if p['id'] == 'right')
    layout.apply_runs(cabinets, [['B01', 'B02']], cat)
    partition = next(p for p in cabinets[0]['parts'] if p['id'] == 'joint-0')
    assert partition['position'][0] == pytest.approx(right_of_b01['position'][0] + thickness / 2)
    assert partition['size'] == right_of_b01['size']


def test_a_partition_drops_in_from_above_because_it_cannot_slide_out_sideways():
    config, cabinets = build()
    layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    partition = next(p for p in cabinets[0]['parts'] if p['id'] == 'joint-0')
    assert partition['assembly_axis'] == [0, 1, 0]
    assert partition['parent_id'] is None


def test_no_part_is_left_naming_a_panel_that_is_no_longer_there():
    # A part may name the run's shared partition, which stands in the neighbouring bay's
    # assembly for one side of the joint. It may not name a gable that was deleted.
    config, cabinets = build()
    layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    for cabinet in cabinets:
        ids = {p['id'] for p in cabinet['parts']}
        for part in cabinet['parts']:
            parent = part['parent_id']
            if parent is None or parent == 'joint-0':
                continue
            assert parent in ids, f"{cabinet['id']}: {part['id']} names a missing {parent}"


def test_a_part_that_was_mounted_on_a_removed_gable_now_names_the_partition():
    config, cabinets = build()
    layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    b01 = next(c for c in cabinets if c['id'] == 'B01')
    mounted_on_the_right = [p for p in b01['parts'] if p['id'].startswith('slide-') and p['id'].endswith('-r')]
    assert mounted_on_the_right
    assert {p['parent_id'] for p in mounted_on_the_right} == {'joint-0'}


def test_a_drawer_bay_on_the_right_of_a_joint_keeps_its_runners_too():
    # The join runs both ways; build the primitive directly so the drawer bay is on the
    # far side of the joint, which the shipped layouts do not happen to produce.
    cat = layout.load_catalog('euro32')
    members = [
        {'id': 'L', 'width': 762.0, 'offset': 0.0, 'parts': recipe.build_parts(cat, 762.0, 'base')},
        {'id': 'R', 'width': 762.0, 'offset': 762.0, 'parts': recipe.build_parts(cat, 762.0, 'drawers')},
    ]
    lists, report = recipe.fuse_run(cat, members)
    assert report['fused'] is True
    runners = [p for p in lists[1] if p['name'] == cat.hardware['slide']['name']]
    assert len(runners) == 6                      # three drawers, two runners each
    # The bay's own right gable survives, so those runners keep it. Only the runners
    # that were bolted to the removed left gable move to the shared partition.
    assert {p['parent_id'] for p in runners if p['id'].endswith('-l')} == {'joint-0'}
    assert {p['parent_id'] for p in runners if p['id'].endswith('-r')} == {'right'}


# -------------------------------------------------------------- the silent failure
def test_a_drawer_bay_keeps_every_runner_through_a_merge():
    """A slide is parented to a gable. A merge must not match on the parent."""
    config, cabinets = build()
    before = names(cabinets)
    layout.apply_runs(cabinets, [['B01', 'B02']], layout.load_catalog('euro32'))
    after = names(cabinets)
    for kept in ['Soft-close undermount slide', '160 mm bar pull', 'Full-overlay cabinet door', 'Drawer front']:
        assert after[kept] == before[kept], kept


# ------------------------------------------------------------------- longer runs
def test_a_three_bay_run_leaves_the_middle_bay_no_gable_of_its_own():
    config, cabinets = build()
    reports, joints = layout.apply_runs(cabinets, [['B01', 'B02', 'B03']], layout.load_catalog('euro32'))
    assert joints == 2
    assert gables(cabinets, 'B01') == ['left', 'joint-0']
    assert gables(cabinets, 'B02') == ['joint-1']
    assert gables(cabinets, 'B03') == ['right']


def test_a_run_keeps_its_two_outer_gables_whatever_its_length():
    config, cabinets = build()
    layout.apply_runs(cabinets, [['B01', 'B02', 'B03']], layout.load_catalog('euro32'))
    assert 'left' in gables(cabinets, 'B01')
    assert 'right' in gables(cabinets, 'B03')


def test_a_run_across_the_return_fuses_as_well_as_one_along_the_back_wall():
    # B04 and B05 are the rotated bays of the L; they are a run like any other.
    config, cabinets = build()
    before = names(cabinets)
    reports, joints = layout.apply_runs(cabinets, [['B04', 'B05']], layout.load_catalog('euro32'))
    after = names(cabinets)
    assert joints == 1
    assert reports[0]['fused'] is True
    assert after['Shared run partition'] == 1
    assert after['Left machined gable'] == before['Left machined gable'] - 1
    assert after['Right machined gable'] == before['Right machined gable'] - 1


# ---------------------------------------------------------------- refusals, not guesses
def test_a_corner_is_refused_rather_than_guessed_at():
    config, cabinets = build()
    before = [list(c['parts']) for c in cabinets]
    reports, joints = layout.apply_runs(cabinets, [['C01', 'B04']], layout.load_catalog('euro32'))
    assert joints == 0
    assert reports[0]['fused'] is False
    assert 'corner' in reports[0]['reason']
    assert [c['parts'] for c in cabinets] == before


def test_a_run_whose_bays_do_not_face_the_same_way_is_refused():
    config, cabinets = build()
    before = [list(c['parts']) for c in cabinets]
    reports, joints = layout.apply_runs(cabinets, [['B03', 'B04']], layout.load_catalog('euro32'))
    assert joints == 0
    assert reports[0]['fused'] is False
    assert [c['parts'] for c in cabinets] == before


def test_a_refused_run_still_reports_which_cabinets_it_was_about():
    config, cabinets = build()
    reports, _ = layout.apply_runs(cabinets, [['C01', 'B04']], layout.load_catalog('euro32'))
    assert set(reports[0]['ids']) == {'C01', 'B04'}


# ------------------------------------------------------------------------- the money
def test_labour_is_charged_per_carcass_and_finishing_stays_per_bay():
    config, cabinets = build()
    before = layout.make_quote(cabinets, config)
    cat = layout.load_catalog('euro32')
    _, joints = layout.apply_runs(cabinets, [['B01', 'B02']], cat)
    after = layout.make_quote(cabinets, config, assemblies=len(cabinets) - joints)
    assert after['labor'] == pytest.approx(before['labor'] - 2.5 * config.quote.labor_rate)
    # A fused run still has every front it had before.
    assert after['finishing'] == before['finishing']
    assert after['total'] < before['total']


def test_the_dimensions_report_how_many_gables_a_merge_removed():
    config, cabinets = build()
    cat = layout.load_catalog('euro32')
    _, joints = layout.apply_runs(cabinets, [['B01', 'B02', 'B03']], cat)
    assert layout.dimensions(cabinets, cat, shared_gables=joints)['shared_gable_allowance'] == 2


def test_an_ungrouped_job_reports_no_shared_gables():
    config, cabinets = build()
    _, joints = layout.apply_runs(cabinets, [], layout.load_catalog('euro32'))
    assert layout.dimensions(cabinets, layout.load_catalog('euro32'), shared_gables=joints)['shared_gable_allowance'] == 0


# ----------------------------------------------------------- the onboarding promise
@pytest.mark.parametrize('catalog', CATALOGS)
def test_a_run_fuses_the_same_way_through_any_manufacturers_catalog(catalog):
    cat = layout.load_catalog(catalog)
    config, cabinets = build(catalog=catalog)
    before = tally(cabinets)
    slides_before = names(cabinets)[cat.hardware['slide']['name']]
    reports, joints = layout.apply_runs(cabinets, [['B01', 'B02']], cat)
    after = tally(cabinets)
    assert joints == 1
    assert reports[0]['fused'] is True
    assert after['panel'] == before['panel'] - 1
    assert after['fastener'] == before['fastener']
    assert names(cabinets)[cat.hardware['slide']['name']] == slides_before
    assert 'Shared run partition' in names(cabinets)
