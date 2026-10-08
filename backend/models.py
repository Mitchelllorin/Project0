from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


class QuoteSettings(BaseModel):
    show_prices: bool = True
    include_hardware: bool = True
    include_labor: bool = True
    include_finish: bool = True
    labor_rate: float = Field(65, ge=0, le=1000)


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


class Quote(BaseModel):
    lines: list[QuoteLine]
    subtotal: float
    labor: float
    finishing: float
    total: float
    currency: str = 'USD'
    illustrative: bool = True


class SceneResponse(BaseModel):
    cabinets: list[Cabinet]
    quote: Quote
    dimensions: dict
    counts: dict


class GroupRequest(BaseModel):
    configuration: Configuration
    cabinet_ids: list[str] = Field(min_length=2, max_length=10)


class Brand(BaseModel):
    name: str = Field('3D Learning Family', min_length=1, max_length=60)
    subtitle: str = Field('kitchexxxx xxx xxx', max_length=60)
    accent: str = Field('#dca55e', pattern=r'^#[0-9a-fA-F]{6}$')
    logo_url: str = Field('', max_length=2000)

    @field_validator('logo_url')
    @classmethod
    def safe_logo(cls, value):
        if value and not value.startswith('https://'):
            raise ValueError('Logo must use an HTTPS URL')
        return value


class Project(BaseModel):
    id: str
    name: str = Field('The Atelier Kitchen', max_length=100)
    configuration: Configuration
    brand: Brand = Field(default_factory=Brand)
    updated_at: Optional[str] = None