"""Dealer accounts and trade pricing (dealers.py, and the pricing they feed).

The contract worth holding is the boundary, not the plumbing: a code resolves to a
real business and a real tier, a bad code resolves to nothing, an unknown tier
degrades to *list* rather than to a guessed discount, and a signed-in dealer is
priced on the server without changing the list price everybody else sees.
"""

import json
import logging

import pytest

import dealers
import layout
from models import Configuration, DealerRecord, DealerView, Quote, QuoteSettings

SAMPLE = [{'id': 'northline-01', 'name': 'Northline Kitchen & Bath',
           'code': 'northline-2026-trade', 'tier': 'trade', 'region': 'NE'}]

VARIABLES = ['DEALERS', 'DEALER_TIERS', 'DEALERS_FILE', 'DEALER_TIERS_FILE']


@pytest.fixture(autouse=True)
def clean_environment(monkeypatch):
    """A test must not inherit the dealer list of the deployment it runs in."""
    for variable in VARIABLES:
        monkeypatch.delenv(variable, raising=False)


def configured(monkeypatch, entries=None, tiers=None):
    monkeypatch.setenv('DEALERS', json.dumps(SAMPLE if entries is None else entries))
    if tiers is not None:
        monkeypatch.setenv('DEALER_TIERS', json.dumps(tiers))


def priced_quote(dealer=None, resale_discount=0.0):
    config = Configuration(quote=QuoteSettings(resale_discount=resale_discount))
    cabinets = layout.build_layout(config)
    return config, layout.make_quote(cabinets, config, dealer)


def sample_dealer():
    return dealers.view_for(DealerRecord(**SAMPLE[0]))


# --- configuration -------------------------------------------------------------------

def test_a_deployment_with_no_dealers_is_simply_not_configured():
    assert dealers.is_configured() is False
    assert dealers.resolve('northline-2026-trade') is None


def test_dealers_come_from_the_environment(monkeypatch):
    configured(monkeypatch)
    assert dealers.is_configured() is True
    assert [record.id for record in dealers.dealer_records()] == ['northline-01']


def test_a_tier_that_is_not_configured_is_reported_not_invented(monkeypatch, caplog):
    configured(monkeypatch, [{'id': 'n1', 'name': 'Northline', 'code': 'northline-2026-trade',
                              'tier': 'platinum'}])
    with caplog.at_level(logging.WARNING):
        view = dealers.resolve('northline-2026-trade')
    assert view.discount == 0.0, 'a bad tier must never hand out a discount'
    assert view.tier == 'list'
    assert 'platinum' in caplog.text


def test_custom_tiers_override_the_defaults(monkeypatch):
    configured(monkeypatch, tiers=[{'id': 'trade', 'name': 'Trade', 'discount': 0.42}])
    assert dealers.dealer_tiers()['trade'].discount == 0.42


def test_an_unusable_tier_entry_is_dropped_rather_than_crashing(monkeypatch, caplog):
    configured(monkeypatch, tiers=[{'id': 'trade', 'name': 'Trade', 'discount': 'a lot'}])
    with caplog.at_level(logging.WARNING):
        tiers = dealers.dealer_tiers()
    assert tiers['trade'].discount == 0.35, 'unset tiers fall back to the shipped defaults'
    assert 'DEALER_TIERS' in caplog.text


def test_a_dealer_list_can_live_in_a_file(monkeypatch, tmp_path):
    """A list of shared secrets belongs in a mounted file, not in a compose value."""
    path = tmp_path / 'dealers.json'
    path.write_text(json.dumps(SAMPLE), encoding='utf-8')
    monkeypatch.setenv('DEALERS_FILE', str(path))
    assert dealers.resolve('northline-2026-trade').id == 'northline-01'


def test_the_file_wins_over_the_inline_setting(monkeypatch, tmp_path):
    path = tmp_path / 'dealers.json'
    path.write_text(json.dumps([{'id': 'n9', 'name': 'From the file',
                                 'code': 'from-the-file-code'}]), encoding='utf-8')
    monkeypatch.setenv('DEALERS_FILE', str(path))
    monkeypatch.setenv('DEALERS', json.dumps(SAMPLE))
    assert [record.id for record in dealers.dealer_records()] == ['n9']


def test_an_unreadable_file_is_reported_and_falls_back(monkeypatch, caplog):
    monkeypatch.setenv('DEALERS_FILE', '/nowhere/dealers.json')
    monkeypatch.setenv('DEALERS', json.dumps(SAMPLE))
    with caplog.at_level(logging.WARNING):
        assert dealers.resolve('northline-2026-trade').id == 'northline-01'
    assert 'DEALERS_FILE' in caplog.text


@pytest.mark.parametrize('raw', ['not json', '{"a": 1}', '[1, 2]'])
def test_a_malformed_variable_leaves_the_instance_serving(monkeypatch, caplog, raw):
    monkeypatch.setenv('DEALERS', raw)
    with caplog.at_level(logging.WARNING):
        assert dealers.dealer_records() == []
    assert 'DEALERS' in caplog.text


def test_a_guessable_code_is_refused(monkeypatch, caplog):
    """A four-character code is an account anyone could walk into."""
    configured(monkeypatch, [{'id': 'n1', 'name': 'Northline', 'code': '1234'}])
    with caplog.at_level(logging.WARNING):
        assert dealers.dealer_records() == []
    assert 'DEALERS' in caplog.text


def test_a_refused_entry_never_puts_the_code_in_the_log(monkeypatch, caplog):
    configured(monkeypatch, [{'id': 'n1', 'code': 'short'}])
    with caplog.at_level(logging.WARNING):
        dealers.dealer_records()
    assert 'short' not in caplog.text
    assert "'code': '***'" in caplog.text


# --- resolving a code -----------------------------------------------------------------

def test_a_valid_code_resolves_to_the_dealer_and_their_tier(monkeypatch):
    configured(monkeypatch)
    view = dealers.resolve('northline-2026-trade')
    assert (view.id, view.name, view.tier, view.tier_name) == \
        ('northline-01', 'Northline Kitchen & Bath', 'trade', 'Trade')
    assert view.discount == 0.35


def test_the_session_payload_cannot_carry_the_access_code(monkeypatch):
    configured(monkeypatch)
    view = dealers.resolve('northline-2026-trade')
    assert 'code' not in view.model_dump()
    assert 'code' not in DealerView.model_fields


@pytest.mark.parametrize('offered', ['', None, 'northline-2026-TRADE', 'northline-2026-trad',
                                     ' northline-2026-trade ', 'ünïcödé'])
def test_a_wrong_code_resolves_to_nothing(monkeypatch, offered):
    configured(monkeypatch)
    assert dealers.resolve(offered) is None


def test_a_deactivated_dealer_cannot_sign_in(monkeypatch):
    configured(monkeypatch, [{**SAMPLE[0], 'active': False}])
    assert dealers.resolve('northline-2026-trade') is None


def test_the_search_does_not_stop_at_the_first_account(monkeypatch):
    """Two accounts, the match second: every code must be compared either way."""
    configured(monkeypatch, [
        {'id': 'n1', 'name': 'Northline', 'code': 'northline-2026-trade'},
        {'id': 'n2', 'name': 'Southline', 'code': 'southline-2026-trade', 'tier': 'distributor'},
    ])
    assert dealers.resolve('southline-2026-trade').tier == 'distributor'
    assert dealers.resolve('northline-2026-trade').tier == 'list'


# --- pricing ----------------------------------------------------------------------------

def test_list_pricing_is_unchanged_when_nobody_is_signed_in():
    """Base-cabinet list total for the default concept, as it was before dealers existed."""
    _, quote = priced_quote()
    assert quote['total'] == 6399.08
    assert 'price_tier' not in quote
    assert Quote(**quote).price_tier is None


def test_a_dealer_is_priced_off_list_without_changing_it():
    dealer = sample_dealer()
    _, listed = priced_quote()
    _, trade = priced_quote(dealer, resale_discount=0.15)
    assert trade['total'] == listed['total'], 'list price is what the end customer sees'
    assert trade['subtotal'] == listed['subtotal']

    tier = Quote(**trade).price_tier
    assert tier.tier == 'trade' and tier.tier_name == 'Trade' and tier.discount == 0.35
    assert tier.list_total == listed['total']
    assert tier.cost_materials == round(listed['subtotal'] * 0.65, 2)
    # Labour and finishing are the dealer's own, at cost: undiscounted.
    assert tier.cost_total == round(tier.cost_materials + listed['labor'] + listed['finishing'], 2)
    assert tier.client_total == round(listed['total'] * 0.85, 2)
    assert tier.margin == round(tier.client_total - tier.cost_total, 2)
    assert tier.margin_pct == round(tier.margin / tier.client_total, 4)


def test_selling_at_list_is_the_default_resale():
    _, listed = priced_quote()
    _, trade = priced_quote(sample_dealer())
    assert trade['price_tier']['client_total'] == listed['total'], \
        'a dealer who gives nothing away quotes the customer the list price'


def test_an_empty_kitchen_prices_to_zero_without_dividing_by_zero():
    """A layout with nothing in it: every figure is zero, including the percentage."""
    config = Configuration(quote=QuoteSettings(resale_discount=0.5))
    quote = layout.make_quote([], config, sample_dealer())
    assert quote['total'] == 0
    tier = quote['price_tier']
    assert (tier['cost_total'], tier['client_total'], tier['margin']) == (0, 0, 0)
    assert tier['margin_pct'] == 0.0


def test_selling_below_cost_reports_a_negative_margin_rather_than_hiding_it():
    """A dealer discounting past their own cost has to be able to see that."""
    _, trade = priced_quote(sample_dealer(), resale_discount=0.9)
    tier = trade['price_tier']
    assert tier['margin'] < 0 and tier['margin_pct'] < 0
    assert tier['margin'] == round(tier['client_total'] - tier['cost_total'], 2)


def test_a_tier_cannot_be_smuggled_in_through_the_request_body():
    """The discount is earned by the code, so the body must have nowhere to put one."""
    fields = set(Configuration.model_fields) | set(QuoteSettings.model_fields)
    assert not fields & {'discount', 'tier', 'dealer', 'price_tier'}


@pytest.mark.parametrize('resale', [-0.1, 0.91, 2])
def test_an_impossible_resale_discount_is_rejected(resale):
    with pytest.raises(ValueError):
        QuoteSettings(resale_discount=resale)
