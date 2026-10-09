"""Regression tests for Kitchen Studio API core flows and validation."""

import os
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


@pytest.fixture(scope="session")
def api_client():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not set")
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def default_config():
    return {
        "layout": "l-shape",
        "finish": "oak",
        "style": "slab",
        "countertop": "calacatta",
        "surface": "honed",
        "backsplash": "tile",
        "hardware": "brass",
        "island": True,
        "ceiling": False,
        "ceiling_opacity": 0.08,
        "rack": "none",
        "dimensions": True,
        "units": "mm",
        "lighting": "daylight",
        "widths": {},
        "groups": [],
        "quote": {
            "show_prices": True,
            "include_hardware": True,
            "include_labor": True,
            "include_finish": True,
            "labor_rate": 65,
        },
    }


# modules: health + catalog + assembly retrieval
def test_root_ok(api_client):
    response = api_client.get(f"{BASE_URL}/api/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Kitchen Studio Assembly API"
    assert data["version"] == "1.0.0"


def test_catalog_has_euro_products(api_client):
    response = api_client.get(f"{BASE_URL}/api/catalog")
    assert response.status_code == 200
    data = response.json()
    ids = {item["id"] for item in data}
    assert {"euro-base", "euro-drawers", "euro-corner"}.issubset(ids)


@pytest.mark.parametrize("product_id", ["euro-base", "euro-drawers", "euro-corner"])
def test_known_assemblies_return_parts(api_client, product_id):
    response = api_client.get(f"{BASE_URL}/api/assemblies/{product_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == product_id
    assert isinstance(data["parts"], list)
    assert len(data["parts"]) > 0


def test_unknown_assembly_404(api_client):
    response = api_client.get(f"{BASE_URL}/api/assemblies/unknown")
    assert response.status_code == 404
    assert "Assembly not found" in response.json().get("detail", "")


# modules: configure defaults + geometry/metadata checks
def test_configure_default_counts_and_total(api_client, default_config):
    response = api_client.post(f"{BASE_URL}/api/configure", json=default_config)
    assert response.status_code == 200
    data = response.json()
    assert len(data["cabinets"]) == 8
    assert data["counts"] == {"panel": 89, "hardware": 48, "fastener": 240}
    assert data["quote"]["total"] == 6399.08


def test_corner_contains_real_polygon_and_45_degree_face(api_client, default_config):
    response = api_client.post(f"{BASE_URL}/api/configure", json=default_config)
    assert response.status_code == 200
    data = response.json()
    corner = next(c for c in data["cabinets"] if c["id"] == "C01")
    corner_geom = [p for p in corner["parts"] if p["geometry"] == "corner"]
    diagonal_door = next(p for p in corner["parts"] if p["id"] == "door-1")
    assert len(corner_geom) >= 1
    assert diagonal_door["rotation"][1] == pytest.approx(-0.785398, abs=1e-3)
    assert isinstance(corner_geom[0]["machining"].get("polygon"), list)


def test_part_parent_and_axis_metadata_valid(api_client, default_config):
    response = api_client.post(f"{BASE_URL}/api/configure", json=default_config)
    assert response.status_code == 200
    data = response.json()
    for cabinet in data["cabinets"]:
        part_ids = {p["id"] for p in cabinet["parts"]}
        for part in cabinet["parts"]:
            parent_id = part.get("parent_id")
            if parent_id is not None:
                assert parent_id in part_ids
            axis = part["assembly_axis"]
            assert isinstance(axis, list) and len(axis) == 3
            assert all(isinstance(v, (int, float)) for v in axis)


# modules: validation checks
def test_invalid_layout_enum_422(api_client, default_config):
    payload = {**default_config, "layout": "u-shape"}
    response = api_client.post(f"{BASE_URL}/api/configure", json=payload)
    assert response.status_code == 422


def test_invalid_width_increment_422(api_client, default_config):
    payload = {**default_config, "widths": {"B01": 500}}
    response = api_client.post(f"{BASE_URL}/api/configure", json=payload)
    assert response.status_code == 422


def test_labor_rate_over_cap_422(api_client, default_config):
    payload = {**default_config, "quote": {**default_config["quote"], "labor_rate": 1001}}
    response = api_client.post(f"{BASE_URL}/api/configure", json=payload)
    assert response.status_code == 422


# modules: group preview merge/unmerge constraints
def test_group_preview_neighboring_cabinets_ok(api_client, default_config):
    payload = {"configuration": default_config, "cabinet_ids": ["B01", "B02"]}
    response = api_client.post(f"{BASE_URL}/api/groups/preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["run_length"] == 1676.4
    assert data["footprint_width"] == 1676.4
    assert data["footprint_depth"] == 609.6
    assert set(data["child_ids"]) == {"B01", "B02"}


def test_group_preview_distant_cabinets_rejected(api_client, default_config):
    payload = {"configuration": default_config, "cabinet_ids": ["B01", "B05"]}
    response = api_client.post(f"{BASE_URL}/api/groups/preview", json=payload)
    assert response.status_code == 400
    assert "neighboring cabinets" in response.json().get("detail", "")


def test_group_preview_corner_and_adjacent_returns_rotated_footprint(api_client, default_config):
    payload = {"configuration": default_config, "cabinet_ids": ["C01", "B04"]}
    response = api_client.post(f"{BASE_URL}/api/groups/preview", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["footprint_width"] > 900
    assert data["footprint_depth"] > 1200


# modules: project save and retrieval persistence
def test_save_and_get_project_without_objectid(api_client, default_config):
    project_id = str(uuid.uuid4())
    payload = {
        "id": project_id,
        "name": "TEST_Project",
        "configuration": default_config,
        "brand": {
            "name": "3D Learning Family",
            "subtitle": "kitchexxxx xxx xxx",
            "accent": "#dca55e",
            "logo_url": "",
        },
    }
    put_response = api_client.put(f"{BASE_URL}/api/projects/{project_id}", json=payload)
    assert put_response.status_code == 200
    put_data = put_response.json()
    assert put_data["id"] == project_id
    assert "updated_at" in put_data and put_data["updated_at"]

    get_response = api_client.get(f"{BASE_URL}/api/projects/{project_id}")
    assert get_response.status_code == 200
    get_data = get_response.json()
    assert get_data["id"] == project_id
    assert get_data["configuration"]["layout"] == "l-shape"
    assert "_id" not in get_data


def test_project_invalid_uuid_rejected(api_client, default_config):
    payload = {
        "id": "not-a-uuid",
        "name": "Bad",
        "configuration": default_config,
        "brand": {
            "name": "3D Learning Family",
            "subtitle": "kitchexxxx xxx xxx",
            "accent": "#dca55e",
            "logo_url": "",
        },
    }
    response = api_client.put(f"{BASE_URL}/api/projects/not-a-uuid", json=payload)
    assert response.status_code == 400
    assert "Invalid project identifier" in response.json().get("detail", "")
