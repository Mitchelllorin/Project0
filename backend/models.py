from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


class QuoteSettings(BaseModel):
    show_prices: bool = True
    include_hardware: bool = True
    include_labor: bool = True
    include_finish: bool = True
    labor_rate: float = Field(65, ge=0, le=1000)
    # What a signed-in dealer knocks off list for their own customer. Their choice,
    # not a privilege: the trade discount above is the part that must be earned.
    resale_discount: float = Field(0, ge=0, le=0.9)


class Placement(BaseModel):
    """A freely placed cabinet in a custom (arranged) layout, in millimetres."""
    id: str = Field(min_length=1, max_length=12)
    kind: Literal['base', 'drawers', 'corner', 'corner-out'] = 'base'
    width: float = Field(762, ge=304.8, le=1524)
    x: float = Field(0, ge=-20000, le=20000)
    z: float = Field(0, ge=-20000, le=20000)
    rotation: float = Field(0, ge=-6.28319, le=6.28319)


class Configuration(BaseModel):
    layout: Literal['l-shape', 'straight', 'galley'] = 'l-shape'
    finish: Literal['oak', 'walnut', 'sage', 'ivory', 'charcoal'] = 'oak'
    style: Literal['slab', 'shaker', 'fluted'] = 'slab'
    countertop: Literal['calacatta', 'concrete', 'noir'] = 'calacatta'
    surface: Literal['honed', 'polished'] = 'honed'
    backsplash: Literal['tile', 'marble', 'none'] = 'tile'
    hardware: Literal['brass', 'black', 'steel'] = 'brass'
    island: bool = True
    ceiling: bool = False
    ceiling_opacity: float = Field(.08, ge=0, le=1)
    rack: Literal['none', 'steel', 'wood', 'brass', 'grid'] = 'none'
    dimensions: bool = True
    units: Literal['mm', 'in'] = 'mm'
    lighting: Literal['daylight', 'evening'] = 'daylight'
    widths: dict[str, float] = Field(default_factory=dict)
    groups: list[list[str]] = Field(default_factory=list, max_length=10)
    quote: QuoteSettings = Field(default_factory=QuoteSettings)
    catalog: str = 'euro32'
    custom: bool = False
    placements: list[Placement] = Field(default_factory=list, max_length=40)

    @field_validator('widths')
    @classmethod
    def valid_widths(cls, value):
        if len(value) > 10:
            raise ValueError('Too many cabinet widths')
        for width in value.values():
            if width < 457.2 or width > 1219.2 or abs(width / 76.2 - round(width / 76.2)) > .001:
                raise ValueError('Widths must be 18–48 inches in 3-inch increments')
        return value


class Part(BaseModel):
    id: str
    name: str
    category: Literal['panel', 'hardware', 'fastener']
    geometry: str = 'box'
    position: list[float]
    size: list[float]
    rotation: list[float] = [0, 0, 0]
    assembly_axis: list[float]
    assembly_order: int
    parent_id: Optional[str] = None
    travel: float = 180
    material: str = 'plywood'
    price: float = 0
    machining: dict = Field(default_factory=dict)
    edges: Optional[dict] = None


class Cabinet(BaseModel):
    id: str
    name: str
    kind: str
    width: float
    height: float = 876.3
    depth: float = 609.6
    position: list[float]
    rotation: float = 0
    parts: list[Part]


class CatalogItem(BaseModel):
    id: str
    name: str
    kind: str
    width: float
    standard: str
    sources: list[str]
    revision: str


class ProductAssembly(CatalogItem):
    parts: list[Part]


class QuoteLine(BaseModel):
    key: str
    name: str
    category: str
    quantity: int
    unit_price: float
    total: float


class PriceTier(BaseModel):
    """What one of a manufacturer's price tiers buys at, off list.

    `discount` applies to the products the manufacturer supplies — materials,
    components and surfaces — not to the dealer's own labour or finishing.
    """
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=60)
    discount: float = Field(0, ge=0, lt=1)


class DealerRecord(BaseModel):
    """A dealer account as configured (DEALERS), including its access code.

    The code has a floor on its length so a deployment cannot admit an account
    that is trivially guessable.
    """
    id: str = Field(min_length=1, max_length=60)
    name: str = Field(min_length=1, max_length=80)
    code: str = Field(min_length=8, max_length=200)
    tier: str = Field('list', min_length=1, max_length=40)
    region: str = Field('', max_length=60)
    active: bool = True


class DealerView(BaseModel):
    """A signed-in dealer, as the studio is told about them. Never the code."""
    id: str
    name: str
    tier: str
    tier_name: str
    discount: float
    region: str = ''


class DealerSignIn(BaseModel):
    code: str = Field(min_length=1, max_length=200)


class DealerSession(BaseModel):
    dealer: DealerView


class QuotePriceTier(BaseModel):
    """Trade pricing for a signed-in dealer.

    `cost_*` is what the dealer pays the manufacturer; `client_*` is what the
    dealer would quote their own customer at the resale discount they have
    chosen. Absent entirely when nobody is signed in.
    """
    tier: str
    tier_name: str
    discount: float
    list_total: float
    cost_materials: float
    cost_total: float
    client_total: float
    margin: float
    margin_pct: float
    currency: str = 'USD'


class Quote(BaseModel):
    lines: list[QuoteLine]
    subtotal: float
    labor: float
    finishing: float
    total: float
    currency: str = 'USD'
    illustrative: bool = True
    price_tier: Optional[QuotePriceTier] = None


# `runs` reports what each merged run did to its cut list: how many joint gables went,
# and why the run was left alone when it could not be fused.
class SceneResponse(BaseModel):
    cabinets: list[Cabinet]
    quote: Quote
    dimensions: dict
    counts: dict
    runs: list[dict] = Field(default_factory=list)


class GroupRequest(BaseModel):
    configuration: Configuration
    cabinet_ids: list[str] = Field(min_length=2, max_length=10)

class Brand(BaseModel):
    name: str = Field('3D Learning Family', min_length=1, max_length=60)
    subtitle: str = Field('Project Zero — Kitchen Visualizer', max_length=60)
    accent: str = Field('#dca55e', pattern=r'^#[0-9a-fA-F]{6}$')
    logo_url: str = Field('', max_length=2000)

    @field_validator('logo_url')
    @classmethod
    def safe_logo(cls, value):
        if value and not value.startswith('https://'):
            raise ValueError('Logo must use an HTTPS URL')
        return value


class Deployment(BaseModel):
    """What a client's instance is configured as, served to the studio at boot so a
    deployment can be re-branded without rebuilding the frontend (see DEPLOY.md)."""
    brand: Brand = Field(default_factory=Brand)
    catalog: str = 'euro32'


class Project(BaseModel):
    id: str
    name: str = Field('The Atelier Kitchen', max_length=100)
    configuration: Configuration
    brand: Brand = Field(default_factory=Brand)
    updated_at: Optional[str] = None