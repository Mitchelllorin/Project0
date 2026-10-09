"""Generic Euro cabinet, in millimetres. Original geometry, no proprietary CAD.

All locations are cabinet-local, y up, front +z. Axes point in removal direction.
Children inherit their parent's displacement before their own stage separates.

The geometry itself now lives in the data-driven engine (recipe.py) driven by the
catalog in catalog/euro32.json. This module is the default-catalog entry point;
a different manufacturer is a different catalog document, not different code.
"""
from functools import lru_cache

from recipe import build_parts, load_catalog

T, BACK, H, D, TOE = 19.05, 6.35, 876.3, 609.6, 101.6

DEFAULT_CATALOG = load_catalog('euro32')


@lru_cache(maxsize=256)
def make_parts(width=762.0, kind='base', catalog=None):
    """Parts for one cabinet under the given catalog (defaults to the shipped one)."""
    return build_parts(catalog or DEFAULT_CATALOG, width, kind)
