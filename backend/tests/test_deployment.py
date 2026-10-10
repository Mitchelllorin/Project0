"""Contract tests for deployment-level configuration (deployment.py).

A deployment is one client. What has to hold for handing a client an instance is
that branding and the shipped catalog are set from the environment alone, that a
client's typo degrades to a *working* instance rather than a broken one, and that
the studio is told the truth about what it actually got.
"""

import json
import logging

import pytest

import deployment
import recipe
from models import Brand, Deployment

BRAND_VARS = ['BRAND_NAME', 'BRAND_SUBTITLE', 'BRAND_ACCENT', 'BRAND_LOGO_URL', 'DEFAULT_CATALOG']


@pytest.fixture(autouse=True)
def clean_environment(monkeypatch):
    """Tests must not inherit the deployment they happen to be running in."""
    for variable in BRAND_VARS:
        monkeypatch.delenv(variable, raising=False)


def test_unset_environment_falls_back_to_the_built_in_defaults():
    assert deployment.deployment_brand() == Brand()
    assert deployment.deployment_catalog() == 'euro32'


def test_every_brand_field_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv('BRAND_NAME', 'Northline Cabinetry')
    monkeypatch.setenv('BRAND_SUBTITLE', 'Kitchen Configurator')
    monkeypatch.setenv('BRAND_ACCENT', '#4f8cff')
    monkeypatch.setenv('BRAND_LOGO_URL', 'https://cdn.example.com/logo.svg')
    assert deployment.deployment_brand() == Brand(name='Northline Cabinetry', subtitle='Kitchen Configurator',
                                                 accent='#4f8cff', logo_url='https://cdn.example.com/logo.svg')


def test_a_bad_value_is_dropped_without_discarding_the_rest_of_the_brand(monkeypatch, caplog):
    monkeypatch.setenv('BRAND_NAME', 'Northline Cabinetry')
    monkeypatch.setenv('BRAND_ACCENT', 'blue')  # not a #rrggbb colour
    with caplog.at_level(logging.WARNING):
        brand = deployment.deployment_brand()
    assert (brand.name, brand.accent) == ('Northline Cabinetry', '#dca55e')
    assert 'BRAND_ACCENT' in caplog.text


def test_a_logo_must_be_https(monkeypatch, caplog):
    monkeypatch.setenv('BRAND_LOGO_URL', 'http://insecure.example.com/logo.png')
    with caplog.at_level(logging.WARNING):
        assert deployment.deployment_brand().logo_url == ''
    assert 'BRAND_LOGO_URL' in caplog.text


def test_blank_values_are_treated_as_unset(monkeypatch):
    monkeypatch.setenv('BRAND_NAME', '   ')
    monkeypatch.setenv('DEFAULT_CATALOG', '')
    assert deployment.deployment_brand() == Brand()
    assert deployment.deployment_catalog() == 'euro32'


def test_the_shipped_catalog_follows_the_environment(monkeypatch):
    """The onboarding path: a client's own catalog is named, not coded."""
    monkeypatch.setenv('DEFAULT_CATALOG', 'northline-example')
    assert deployment.deployment_catalog() == 'northline-example'


@pytest.mark.parametrize('name', ['does-not-exist', 'euro32.json', ''])
def test_an_unknown_catalog_falls_back_loudly(monkeypatch, caplog, name):
    monkeypatch.setenv('DEFAULT_CATALOG', name)
    with caplog.at_level(logging.WARNING):
        assert deployment.deployment_catalog() == 'euro32'
    if name:
        assert 'DEFAULT_CATALOG' in caplog.text


def test_a_catalog_that_cannot_render_falls_back(monkeypatch, caplog, tmp_path):
    """Installed but unrenderable must not reach the studio as a 400 on every request."""
    with open(recipe.os.path.join(recipe.CATALOG_DIR, 'euro32.json'), encoding='utf-8') as handle:
        broken = json.load(handle)
    del broken['hardware']['hinge']
    (tmp_path / 'unrenderable.json').write_text(json.dumps(broken), encoding='utf-8')
    monkeypatch.setattr(recipe, 'CATALOG_DIR', str(tmp_path))
    monkeypatch.setenv('DEFAULT_CATALOG', 'unrenderable')
    with caplog.at_level(logging.WARNING):
        assert deployment.deployment_catalog() == 'euro32'
    assert 'not renderable' in caplog.text


def test_a_structurally_broken_catalog_file_falls_back(monkeypatch, caplog, tmp_path):
    """A hand-edited onboarding file is the likeliest bad input in the field."""
    (tmp_path / 'unreadable.json').write_text('{"name": "Half a catalog"}', encoding='utf-8')
    monkeypatch.setattr(recipe, 'CATALOG_DIR', str(tmp_path))
    monkeypatch.setenv('DEFAULT_CATALOG', 'unreadable')
    with caplog.at_level(logging.WARNING):
        assert deployment.deployment_catalog() == 'euro32'
    assert 'not an installed catalog' in caplog.text


def test_the_studio_payload_is_a_valid_deployment(monkeypatch):
    monkeypatch.setenv('BRAND_NAME', 'Northline Cabinetry')
    monkeypatch.setenv('DEFAULT_CATALOG', 'northline-example')
    payload = Deployment(**deployment.deployment())
    assert payload.brand.name == 'Northline Cabinetry'
    assert payload.catalog == 'northline-example'
    assert set(payload.model_dump()) == {'brand', 'catalog'}
