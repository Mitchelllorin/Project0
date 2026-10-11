"""Dealer accounts and price tiers.

One deployment serves one manufacturer. Its dealers are accounts *within* that
deployment: an access code that resolves to a real business, and to the trade
price tier that manufacturer sells to them at.

Three rules hold this together:

* The tier is resolved **here**, from the code, on the server. A discount a
  caller could type into a request body is not a discount.
* A code is compared in constant time, never logged, never echoed back and
  never part of a session payload.
* An unknown tier degrades to *list* price, never to a guessed discount — the
  failure mode of a misconfigured tier has to be "the dealer pays more", not
  "the manufacturer gives away margin".

Codes and tiers are configuration rather than code — DEALERS and DEALER_TIERS in
the deployment environment, or DEALERS_FILE and DEALER_TIERS_FILE pointing at a
JSON document — so onboarding a dealer is a configuration change and no rebuild.
A manufacturer with twenty dealers keeps its list in a file it can edit and mount;
a one-dealer deployment can inline it. See DEPLOY.md.
"""

import hmac
import json
import logging
import os

from pydantic import ValidationError

from models import DealerRecord, DealerView, PriceTier

logger = logging.getLogger('kitchen-studio')

# Fallback when DEALER_TIERS is unset. A deployment that only wants one flat
# trade discount needs to configure nothing but its dealers.
DEFAULT_TIERS = [
    {'id': 'list', 'name': 'List', 'discount': 0.0},
    {'id': 'trade', 'name': 'Trade', 'discount': 0.35},
    {'id': 'distributor', 'name': 'Distributor', 'discount': 0.45},
]

# The tier every dealer is charged at when the configured one cannot be found.
LIST_TIER = 'list'


def _source(variable):
    """The JSON text behind a setting, from its _FILE variant if one is set.

    A dealer list belongs in a file for anything past a handful of accounts — it is a
    list of shared secrets, and it should not be baked into an image or pasted into a
    compose file. The inline variable wins only when no file is named.
    """
    path = os.environ.get(variable + '_FILE', '').strip()
    if path:
        try:
            with open(path, encoding='utf-8') as handle:
                return handle.read()
        except OSError as exc:
            logger.warning('Could not read %s_FILE=%r (%s); falling back to %s',
                           variable, path, exc.strerror, variable)
    return os.environ.get(variable, '')


def _parse(raw, label):
    """Parse a JSON list out of the environment, or an empty list.

    A malformed setting is a deployment mistake, so it is reported once, loudly, and
    the instance keeps serving — with no dealers, or with the default tiers.
    """
    if not raw or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
    except ValueError:
        logger.warning('%s is not valid JSON; ignoring it', label)
        return []
    if not isinstance(parsed, list):
        logger.warning('%s must be a JSON array; ignoring it', label)
        return []
    return parsed


def dealer_tiers():
    """The price tiers this deployment sells at, keyed by id."""
    tiers = {}
    for entry in _parse(_source('DEALER_TIERS'), 'DEALER_TIERS'):
        try:
            tier = PriceTier(**entry)
        except (ValidationError, TypeError):
            logger.warning('Ignoring unusable entry in DEALER_TIERS: %r', entry)
            continue
        tiers[tier.id] = tier
    if not tiers:
        tiers = {tier['id']: PriceTier(**tier) for tier in DEFAULT_TIERS}
    if LIST_TIER not in tiers:
        tiers[LIST_TIER] = PriceTier(id=LIST_TIER, name='List', discount=0.0)
    return tiers


def dealer_records():
    """The dealer accounts this deployment knows about, as configured."""
    records = []
    for entry in _parse(_source('DEALERS'), 'DEALERS'):
        try:
            record = DealerRecord(**entry)
        except (ValidationError, TypeError):
            # A code shorter than the minimum, or a missing name: refuse it rather
            # than admit an account nobody can be held to.
            logger.warning('Ignoring unusable entry in DEALERS: %r', _redact(entry))
            continue
        records.append(record)
    return records


def _redact(entry):
    """A dealer entry with the code removed, safe to put in a log line."""
    if isinstance(entry, dict):
        return {key: ('***' if key == 'code' else value) for key, value in entry.items()}
    return None


def is_configured():
    """Whether this deployment can sign a dealer in at all."""
    return bool(dealer_records())


def _matches(configured, offered):
    """Constant-time comparison that survives non-ASCII input."""
    try:
        return hmac.compare_digest(configured.encode('utf-8'), offered.encode('utf-8'))
    except (AttributeError, UnicodeError):
        return False


def resolve(code):
    """The dealer behind an access code, or None.

    Every active account is compared even after a match, so the time taken says
    nothing about which dealer was found.
    """
    if not code:
        return None
    found = None
    tiers = dealer_tiers()
    for record in dealer_records():
        if not record.active:
            continue
        if _matches(record.code, code) and found is None:
            found = record
    if found is None:
        return None
    return view_for(found, tiers)


def view_for(record, tiers=None):
    """What the studio is told about a signed-in dealer. Never the access code."""
    tiers = tiers or dealer_tiers()
    tier = tiers.get(record.tier)
    if tier is None:
        logger.warning('Dealer %s is on unknown tier %r; pricing at list', record.id, record.tier)
        tier = tiers[LIST_TIER]
    return DealerView(id=record.id, name=record.name, tier=tier.id, tier_name=tier.name,
                      discount=tier.discount, region=record.region)
