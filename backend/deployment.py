"""Deployment-level configuration: what *one client's instance* is branded as and
which catalog it ships with.

One deployment is one client. Everything here is read from the environment, so
standing up a branded instance for a manufacturer or distributor is a
`docker compose up` with their variables set — never a code edit and never a
frontend rebuild. See DEPLOY.md.
"""

import logging
import os

from pydantic import ValidationError

from models import Brand
from recipe import load_catalog, validate_catalog

logger = logging.getLogger('kitchen-studio')

# Environment variable per Brand field.
BRAND_ENV = {'name': 'BRAND_NAME', 'subtitle': 'BRAND_SUBTITLE', 'accent': 'BRAND_ACCENT', 'logo_url': 'BRAND_LOGO_URL'}

# Used when DEFAULT_CATALOG is unset or unusable, so a bad value degrades to a
# working instance instead of 400-ing every request.
FALLBACK_CATALOG = 'euro32'


def deployment_brand():
    """Branding from the environment, validated field by field so one typo cannot
    discard the rest of a client's brand."""
    fields = {}
    for field, variable in BRAND_ENV.items():
        raw = os.environ.get(variable, '').strip()
        if not raw:
            continue
        try:
            Brand(**{field: raw})
        except ValidationError as exc:
            logger.warning('Ignoring invalid %s=%r: %s', variable, raw, exc.errors()[0]['msg'])
            continue
        fields[field] = raw
    return Brand(**fields)


def deployment_catalog():
    """The catalog this instance ships with, falling back loudly rather than
    letting an unknown name surface as an obscure failure later."""
    requested = os.environ.get('DEFAULT_CATALOG', '').strip() or FALLBACK_CATALOG
    try:
        catalog = load_catalog(requested)
    except (OSError, ValueError, KeyError, TypeError):
        # Not installed, unreadable, or structurally broken. Falling back keeps the
        # instance serving; the warning is the actionable signal.
        logger.warning('DEFAULT_CATALOG=%r is not an installed catalog; using %r', requested, FALLBACK_CATALOG)
        return FALLBACK_CATALOG
    errors = validate_catalog(catalog.data)
    if errors:
        logger.warning('DEFAULT_CATALOG=%r is not renderable (%s); using %r', requested, errors[0], FALLBACK_CATALOG)
        return FALLBACK_CATALOG
    return requested


def deployment():
    """The whole deployment identity, as the studio fetches it at boot."""
    return {'brand': deployment_brand(), 'catalog': deployment_catalog()}
