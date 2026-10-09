# Catalogs — onboarding a manufacturer

A **catalog** is a JSON document describing one manufacturer's product line. The
**rules engine** (`recipe.py`) knows how to turn *any* catalog into parts,
hardware, machining and price. Adding a manufacturer is therefore a data task:
write a catalog, validate it, ship it. No engine code changes.

```
catalog/<name>.json ──► Catalog (validated) ──► build_parts(catalog, width, kind) ──► Part list
                                                                                      │
                                       explode / assembly axes ◄──────────────────────┤
                                       quote + BOM export    ◄──────────────────────┤
                                       edge banding + machining ◄────────────────────┘
```

- `catalog/euro32.json` — the shipped generic Euro / 32 mm frameless template.
- `catalog/northline-example.json` — a worked onboarding example (hypothetical
  manufacturer: 18 mm carcass, 720 mm height, branded hardware names, PVC
  banding). Nothing in it is real-product data; it exists to prove the path.

## Three steps

1. **Copy** `catalog/northline-example.json` to `catalog/<your-name>.json`.
2. **Fill in** the fields below. Keep the filename slug as the catalog name.
3. **Validate and render**, then use it:

```python
import recipe
catalog = recipe.load_catalog('your-name')
errors = recipe.validate_catalog(catalog.data)   # [] means renderable
parts  = recipe.build_parts(catalog, width=762.0, kind='base')
```

```bash
# API: list catalogs and their onboarding status
curl localhost:8001/api/catalogs

# API: build a kitchen from a chosen manufacturer's catalog
curl -X POST localhost:8001/api/configure -H 'Content-Type: application/json' \
     -d '{"catalog":"your-name","layout":"l-shape","widths":{"B01":762}}'
```

`validate_catalog` is the contract. It returns a list of human-readable errors and
is exercised by `tests/test_catalog_engine.py`.

## Schema

| Field | Required | Meaning |
|---|---|---|
| `id` | ✅ | Stable catalog id. |
| `name` | | Display name. |
| `units` | ✅ | `mm` or `inch`. |
| `revision` | | Your data revision. |
| `manufacturer` | | `{id, name, standard, sources[]}` — provenance for the data. |
| `dimensions.height` | ✅ | Carcass height (excluding toe kick). |
| `dimensions.depth` | ✅ | Carcass depth. |
| `dimensions.toe_kick` | ✅ | Toe kick height. |
| `dimensions.shelf_height` | | Adjustable-shelf centre height. |
| `thickness.carcass` | ✅ | Gable / bottom / door thickness; also the dado width. |
| `thickness.back` | ✅ | Back panel thickness; also the rabbet width. |
| `thickness.drawer` | | Drawer box panel thickness. |
| `joinery.dado.{width,depth}` | ✅ | Bottom-panel dado. |
| `joinery.rabbet.{width,depth}` | ✅ | Back-panel rabbet. |
| `joinery.system.{pitch,front_setback,hole_diameter}` | ✅ | 32 mm system holes. |
| `travel.{panel,hardware,fastener}` | ✅ | Explode distance per stage, mm. |
| `pricing.panel_per_m2` | | Panel price per m²; per-part price derives from cut size. |
| `pricing.hardware_default` | | Fallback unit price for hardware/fasteners. |
| `hardware.<key>.name` | ✅ | Display name, e.g. your hinge. |
| `hardware.<key>.price` | | Unit price → flows into the quote. |
| `hardware.hinge.{cup_diameter,cup_depth,system_pitch,front_setback}` | | Hinge bore detail; emitted as machining. |
| `hardware.hinge_wide` | ✅ | Hinge used on diagonal corner doors. |
| `edge_banding.{material,thickness}` | | Applied to the panel roles listed in `edges`. |
| `edges.<role>` | | Panel roles → banded faces, e.g. `"door":["front","handle","left","right"]`. |
| `labels.<key>` | ✅ | Part names. `{side}` is substituted. |
| `families.<kind>.{name,construct}` | ✅ | Product families; `base` is required. |

Required hardware keys: `hinge`, `hinge_wide`, `slide`, `pull`, `shelf_pin`,
`screw_pozi`, `screw_confirmat`.

## Data vs. rules

**Data** (the catalog): dimensions, thicknesses, joinery, hardware identity and
price, edge banding, labels, price rates, explode travel, and which *construct*
each product family uses.

**Rules** (the engine, in `recipe.py`): how a construct assembles — carcass,
door overlay, hinge placement and bores, drawer stack, corner geometry, assembly
vectors and parent inheritance. Constructs available today:

| Construct | Builds |
|---|---|
| `frameless_base` | Carcass + double overlay doors, hinges, pulls |
| `frameless_drawers` | Carcass + 3-drawer stack, undermount slides |
| `frameless_corner` | Diagonal corner carcass + 45° door |
| `frameless_base_with_return` | Carcass + doors + return door on the side face |

A genuinely new construction method (framed/full-overlay, inset doors, tandem
drawer systems, non-rectangular carcasses) is the one thing that needs code: add a
function to `recipe.py`, list it in `CONSTRUCTS`, and reference it from a family.

## Not yet catalog data (be honest when selling)

These are still hard-coded and would need to move into the catalog before a
manufacturer could change them *without* code:

- **Finishes, countertop and backsplash pricing** — `make_quote` in `layout.py`
  prices finishes/stone/racks from fixed tables, not catalog data.
- **Door styles** (`slab`/`shaker`/`fluted`) and the material swatches are
  front-end/app constants.
- **Width increments and limits** — currently 18–48″ in 3″ steps, enforced in
  `models.py`.
- **Room/layout templates** (l-shape / straight / galley / island) are `layout.py`
  logic, not data.
- **Corner joinery** — `corner-out` and `frameless_corner` are geometric
  approximations, not a manufacturer's real mitered carcass.

Each of these is a contained follow-up: move the table into the catalog document,
read it in the engine, extend `validate_catalog`.
