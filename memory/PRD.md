# Kitchen Studio Visualizer — Phase 0 Pitch Demo

## Original problem statement
Build a web-based reusable 3D configurator and per-fastener assembly/explode engine. First artifact is a polished standalone brandable sales pitch demo to close cabinet manufacturers. One core engine, multiple future front doors; sell before scaling. No login, billing, multi-tenant features, catalog upload or free-draw rooms in Phase 0.

Phase 0 must provide a beautiful configurable kitchen (cabinet style, finish, countertop and surface finish, backsplash, hardware, realistic lighting, dimensions in mm/inches), true staged fastener-level explode (panels, hardware, screws), a real diagonal/L corner carcass with angled face, merge/unmerge logical cabinet groups preserving child assemblies, combined logical run length and bounding wall footprint, illustrative quote/BOM, and prospect branding.

Generic original frameless Euro/32mm base template: 34½in H ×24in D; widths in3in increments;¾in plywood carcass,¼in back,4in toe kick;19.05×9.525mm dado and6.35×9.525mm back rabbet;35mm cup hinges,32mm hole pitch37mm from front, generic undermount slides. No proprietary CAD shipped. Parts carry position, assembly axis, stage, parent, material and price. Fasteners only detailed for selected/exploded cabinets, with instancing and LOD. API should allow later B2B, consumer and embedded skins.

Roadmap: Phase1 manufacturer data/auth/roles; Phase2 save/share, quote exports, leads/catalog administration; Phase3 widget/SDK; Phase4 Stripe multi-tenant manufacturers/consumer skin; Phase5 free-draw room layout.

## Explicit user choices
- Brand: “3D Learning Family - kitchexxxx xxx xxx”; rendered as name and subtitle.
- Logical run length primary, wall footprint secondary.
- Illustrative prices, detailed parts list, settings toggles.
- Hidden/nearly invisible ceiling by default, toggle/double-tap behavior, several ceiling pot-rack styles.
- Preserve styling and match every new control to it. Initial repo had only starter splash; all implemented routes share the same architectural charcoal/amber studio design.

## Personas
- Cabinet manufacturer's sales prospect: evaluates product realism and component-level assembly behavior.
- Presenter/designer: changes kitchen options, demonstrates merge/explode, customizes prospect identity, discusses indicative pricing.

## Architecture decisions
- React19, typed TypeScript assembly math/model module, modular React components; Three.js186, r3f9/drei10; Tailwind/Shadcn for controls, dialogs/switches; consistent custom studio stylesheet.
- FastAPI/Pydantic typed API; Motor/Mongo using existing environment MONGO_URL/DB_NAME only.
- API configuration generates original parametric assemblies; Mongo stores nested product templates and explicit saved projects by UUID. Browser-local draft/identity persists without accounts; Save design writes the same state to Mongo.
- Routes `/`, `/assembly`, `/quote`, `/branding`; no landing page.
- Original procedural wood/marble textures; original mesh geometry, no downloaded CAD/3D assets and no external service credentials.
- Metadata-driven staged vectors, recursively inherited parent displacement. Separate child assemblies after merge, no geometry fusion. Existing templates retain separate gables, so shared-gable allowance is zero, never silently deducted.
- Ceiling layer independent of rack. Native touch raycast gesture handles double-tap; expanded invisible hit target and keyboard-accessible remove button.
- On-demand WebGL rendering with animation invalidation; instanced screws, system-hole markers, backsplash tiles; selected-only detailed hardware. GPU scene inspection exposed at window.__studio3d for verification.
- All API calls use REACT_APP_BACKEND_URL. Backend bound by supervisor on8001. No protected env changes.

## Implemented — 2026-10-08
- Complete branded responsive studio with full 3D kitchen, upper-cabinet/appliance context, island/stools, lights/shadows, orbit/front/top/zoom/reset and PNG capture.
- Five finish choices; slab/shaker/fluted front; three countertops, honed/polished finish; backsplash and hardware swaps; daylight/evening lighting.
- L-shape, straight and galley layouts, optional island, selected base widths18–48in by3in increments.
- Eight configured base units by default,377 component records (89 panels,48 hardware,240 fasteners). Accurate 35mm/32mm nominal hardware and machining dimensions in component metadata; rendered machined gables, corner polygon, angled door, slides and detailed screw preview.
- Assembly categories/search/selection; four stages and continuous0–100% slider; independent screw/hinge/slide inspection including dimensions, axis, parent, material and machining data.
- Adjacent cabinet merge/unmerge; invalid distant pairs rejected. Dual bounds/run readouts, units toggle, grouped assemblies keep both real child part arrays.
- Hidden ceiling by default, opacity slider; industrial steel, oak beam, brass ring and modern-grid racks. Double-click desktop/double-tap touch removes rack and its quote line; explicit matching remove control and no-rack option also available.
- Actual computed illustrative quote/BOM; pricing/hardware/finish/labor toggles and editable labor rate. CSV export. Explicitly scoped to configured base cabinets, selected surfaces and racks, not background upper cabinets/appliances/styling.
- Branding name/subtitle/HTTPS logo/accent; saved identity/design; local draft persistence; pitch mode/escape exit. No APIs mocked.
- API endpoints: GET `/api/`, `/api/catalog`, `/api/assemblies/{product_id}`; POST `/api/configure`, `/api/groups/preview`; PUT/GET `/api/projects/{uuid}`. Input validation and Mongo `_id` exclusion/response models.

## Verification
- Production frontend build passed after compatible TypeScript5.9.3 alignment; removed conflicting jsconfig.
- Final regression re-run:17/17 API tests passed; final production build passed. BOM currency displays cents, so fasteners do not misleadingly appear free.
- Test agent report `/app/test_reports/iteration_1.json`; backend `/app/backend/tests/test_kitchen_api.py`:17/17 pass. Frontend material/layout, metadata, groups, quote/CSV, branding, cameras/PNG, persistence, pitch and mobile drawers passed.
- Initial report flagged rack dismissal. Fixed broad hit target + native touch raycast; verified actual mouse double-click and actual touchscreen double-tap on projected 3D rack, with rack state becoming none and BOM rack row count0.
- Desktop1920×800 and mobile390×844: no horizontal overflow; nonblank canvas pixel checks (496 desktop/277 mobile sampled colors); visible kitchen and exploded assembly. After on-demand rendering, two real mobile touches140ms apart dismiss correctly instead of being delayed by constant software redraws.
- Fixed preview instrumentation entering custom meshes and removed fragile Drei Html DOM portal that errored during route transitions.

## Prioritized backlog / next tasks
### P0
- None for the tested Phase0 scope. Keep manufacturer's construction approval distinct from this generic visualization; not certified production drawings or a binding quote.
### P1 — after first manufacturer commits
- Ingest real manufacturer's catalog/materials/pricing/assembly tolerances; independently review generic joinery and hinge placements against their production system.
- Manufacturer-declared genuinely shared-gable templates and dimension deduplication; current logical merges intentionally retain two gables.
- Higher-fidelity calibrated PBR material library and asset/texture object storage if uploads/assets become necessary.
- Auth, roles and manufacturer-specific data administration.
### P2 — later roadmap
- Share links, formal quote/PDF export, lead capture; catalog admin.
- Embed widget/SDK, manufacturer website integration.
- Multi-tenant Stripe billing/consumer front door; free-draw layouts.

## Useful project references
- `/app/design_guidelines.json`
- Backend: `assembly.py`, `layout.py`, `models.py`, `server.py`.
- Frontend: `src/studio/` with context, typed engine, mesh/room renderers, workspace, controls/inspector, quote and branding pages.
- Preview: https://explode-demo.preview.emergentagent.com