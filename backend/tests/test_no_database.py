"""A deployment with no MONGO_URL: the studio still renders, persistence says so plainly.

Most of the app never needed a database — catalog, layout, quote and dimensions are all
computed from the JSON catalogs in ./catalog. Only saving a design is persistence. That
makes a database optional for a local run, which is worth locking: it is the difference
between "install MongoDB first" and "just run it".
"""

import asyncio
import importlib.util
from pathlib import Path

import dotenv
import pytest
from fastapi import HTTPException

BACKEND = Path(__file__).resolve().parent.parent


def load_server(monkeypatch, mongo_url):
    """Import server.py under a private name, with the environment we want it to see.

    The real backend/.env must not leak in — it is what supplies MONGO_URL on a normal
    run — so load_dotenv is stubbed out for the duration of the import.
    """
    for name in ['MONGO_URL', 'DB_NAME', 'CORS_ORIGINS']:
        monkeypatch.delenv(name, raising=False)
    if mongo_url is not None:
        monkeypatch.setenv('MONGO_URL', mongo_url)
    monkeypatch.setattr(dotenv, 'load_dotenv', lambda *args, **kwargs: False)

    spec = importlib.util.spec_from_file_location('server_under_test', BACKEND / 'server.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_without_a_database_the_api_starts_renders_and_refuses_to_pretend(monkeypatch):
    server = load_server(monkeypatch, mongo_url=None)

    assert server.client is None and server.db is None
    # The startup hook runs on every boot; with no database it must report, not throw.
    asyncio.run(server.seed_catalog())

    # Everything the studio draws comes from the catalogs on disk, so it still works.
    cabinets = server.build_layout(server.Configuration(catalog='euro32', layout='l-shape'),
                                   server.resolve_catalog('euro32'))
    assert cabinets and server.make_quote(cabinets, server.Configuration(), None)['total'] > 0

    # The one thing that is lost is persistence, and it says so rather than failing oddly.
    with pytest.raises(HTTPException) as refused:
        server.require_database()
    assert refused.value.status_code == 503
    assert 'MONGO_URL' in refused.value.detail


def test_with_a_database_configured_persistence_is_available(monkeypatch):
    server = load_server(monkeypatch, mongo_url='mongodb://127.0.0.1:27017')

    assert server.NO_DATABASE is False
    assert server.db is not None
    server.require_database()  # no database configured means no exception


def test_defaults_cover_a_checkout_with_no_env_file(monkeypatch):
    """No .env at all: the addresses the studio needs are still the right ones."""
    server = load_server(monkeypatch, mongo_url=None)
    origins = [o.strip() for o in server.app.user_middleware[0].kwargs['allow_origins']]
    assert 'http://localhost:3000' in origins
