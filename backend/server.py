from fastapi import FastAPI, APIRouter, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy
from uuid import UUID
import logging
import os
from models import Configuration, SceneResponse, GroupRequest, Project, CatalogItem, ProductAssembly, Deployment, DealerSession, DealerSignIn
from layout import build_layout, dimensions, make_quote, adjacent, apply_runs
from assembly import make_parts
from recipe import load_catalog, validate_catalog, available_catalogs
from deployment import deployment
import dealers

logging.basicConfig(level=logging.INFO, format='%(levelname)s %(name)s: %(message)s')
logger = logging.getLogger('kitchen-studio')

load_dotenv(Path(__file__).parent / '.env')
# MongoDB is optional. Everything the studio renders — catalog, layout, quote, dimensions —
# is computed from the JSON catalogs in ./catalog, so a database is needed only to save a
# design and read it back. Set MONGO_URL to enable that (local mongod or a hosted one);
# leave it unset and the studio still runs, with the save endpoints answering 503.
MONGO_URL=os.environ.get('MONGO_URL','').strip()
client=AsyncIOMotorClient(MONGO_URL,serverSelectionTimeoutMS=3000) if MONGO_URL else None
db=client[os.environ.get('DB_NAME','kitchen_studio')] if client is not None else None
NO_DATABASE=db is None
app=FastAPI(title='Kitchen Studio Assembly API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=os.environ.get('CORS_ORIGINS','http://localhost:3000,http://127.0.0.1:3000').split(','),allow_credentials=False,allow_methods=['*'],allow_headers=['*'])
api=APIRouter(prefix='/api')

@app.on_event('startup')
async def seed_catalog():
    global NO_DATABASE, db, client
    if NO_DATABASE:
        logger.warning('No MONGO_URL set — running without a database. The studio renders and prices '
                       'normally; saving a design is disabled.')
        return
    # MONGO_URL being set is not the same as a database being *there*. A powered-off or
    # misconfigured server used to abort startup outright, so the studio refused to open at all
    # over a feature that is optional. Probe first, with a short timeout, and fall back to the
    # no-database mode rather than dying.
    try:
        await client.admin.command('ping')
    except Exception as exc:
        logger.warning('MONGO_URL is set (%s) but no database answered (%s). Continuing without a '
                       'database: the studio renders and prices normally; saving a design is '
                       'disabled.', MONGO_URL, exc)
        try:
            client.close()
        except Exception:
            pass
        client, db, NO_DATABASE = None, None, True
        return
    for kind in ['base','drawers','corner']:
        await db.products.update_one({'id':f'euro-{kind}'},{'$set':{'id':f'euro-{kind}','name':f'Euro 32 / {kind}','kind':kind,'width':914.4 if kind=='corner' else 762,'parts':make_parts(914.4 if kind=='corner' else 762,kind),'standard':'Original generic frameless Euro/32 mm template','sources':['https://publications.blum.com/2024/catalogue/en/153/'],'revision':'1.0'}},upsert=True)

@api.get('/')
async def root(): return {'name':'Kitchen Studio Assembly API','version':'1.0.0'}

def resolve_catalog(name):
    try:
        catalog=load_catalog(name)
    except (OSError, ValueError, KeyError, TypeError):
        # Not installed, unreadable or structurally broken — a bad catalog document,
        # which is a 400 for the caller, never a 500.
        raise HTTPException(400,f'Unknown catalog {name!r}')
    errors=validate_catalog(catalog.data)
    if errors:
        raise HTTPException(400,f'Catalog {name!r} is not renderable: '+'; '.join(errors[:5]))
    return catalog

@api.get('/deployment', response_model=Deployment)
async def deployment_config():
    return deployment()

@api.get('/catalogs')
async def catalogs():
    return available_catalogs()

def require_database():
    """The one capability a deployment without MONGO_URL loses."""
    if NO_DATABASE:
        raise HTTPException(503,'This deployment has no database, so designs cannot be saved or listed. '
                                'Set MONGO_URL to enable it; everything else works without one.')

@api.get('/catalog',response_model=list[CatalogItem])
async def catalog():
    require_database()
    return await db.products.find({}, {'_id':0,'parts':0}).to_list(20)

def current_dealer(x_dealer_code:str|None=Header(default=None)):
    """Who is asking, if it is a dealer.

    No header is not an error: it is the anonymous, list-price view every visitor and
    every shared link gets. A header that does not resolve is a 401, so a dealer whose
    access was revoked is told rather than quietly re-priced at list.
    """
    if not x_dealer_code:
        return None
    if not dealers.is_configured():
        raise HTTPException(401,'Dealer sign-in is not configured on this deployment')
    view=dealers.resolve(x_dealer_code)
    if view is None:
        raise HTTPException(401,'That dealer access code is not recognised')
    return view

@api.post('/dealer/session',response_model=DealerSession)
async def dealer_session(credentials:DealerSignIn):
    if not dealers.is_configured():
        raise HTTPException(503,'Dealer sign-in is not configured on this deployment')
    view=dealers.resolve(credentials.code)
    if view is None:
        raise HTTPException(401,'That dealer access code is not recognised')
    logger.info('Dealer %s signed in on tier %s',view.id,view.tier)
    return dict(dealer=view.model_dump())

@api.post('/configure',response_model=SceneResponse)
async def configure(config:Configuration,dealer=Depends(current_dealer)):
    catalog=resolve_catalog(config.catalog)
    cabinets=build_layout(config,catalog)
    # A merged run is one box, so the joint gables come out here — before the quote and
    # the dimensions are derived from the parts, not patched afterwards.
    runs,joints=apply_runs(cabinets,config.groups,catalog)
    counts={k:sum(1 for c in cabinets for p in c['parts'] if p['category']==k) for k in ['panel','hardware','fastener']}
    return dict(cabinets=cabinets,quote=make_quote(cabinets,config,dealer,assemblies=len(cabinets)-joints),dimensions=dimensions(cabinets,catalog,shared_gables=joints),counts=counts,runs=runs)

@api.get('/assemblies/{product_id}',response_model=ProductAssembly)
async def assembly(product_id:str):
    require_database()
    result=await db.products.find_one({'id':product_id},{'_id':0})
    if not result: raise HTTPException(404,'Assembly not found')
    return result

@api.post('/groups/preview')
async def group_preview(request:GroupRequest):
    ids=list(dict.fromkeys(request.cabinet_ids))
    catalog=resolve_catalog(request.configuration.catalog)
    cabinets=[c for c in build_layout(request.configuration,catalog) if c['id'] in ids]
    if len(ids)<2 or len(cabinets)!=len(ids): raise HTTPException(400,'Select at least two existing cabinets')
    reached={cabinets[0]['id']}
    for _ in cabinets:
        for a in cabinets:
            if a['id'] in reached:
                reached.update(b['id'] for b in cabinets if adjacent(a,b))
    if len(reached)!=len(cabinets): raise HTTPException(400,'Only neighboring cabinets can be merged')
    # The preview answers the question the merge actually asks — what does the run cost
    # once it is one box — by cutting it both ways and showing the difference.
    def tally(units):
        return {k:sum(1 for c in units for p in c['parts'] if p['category']==k) for k in ['panel','hardware','fastener']}
    fused=deepcopy(cabinets)
    runs,joints=apply_runs(fused,[ids],catalog)
    before_total=make_quote(cabinets,request.configuration)['total']
    after_total=make_quote(fused,request.configuration,assemblies=len(fused)-joints)['total']
    return {**dimensions(cabinets,catalog,shared_gables=joints),
            'parts_count':sum(len(c['parts']) for c in fused),
            'geometry_fused':joints>0,'runs':runs,'carcasses_saved':joints,
            'before':{'parts_count':sum(len(c['parts']) for c in cabinets),'counts':tally(cabinets),'total':before_total},
            'after':{'parts_count':sum(len(c['parts']) for c in fused),'counts':tally(fused),'total':after_total},
            'saving':round(before_total-after_total,2)}

@api.put('/projects/{project_id}',response_model=Project)
async def save_project(project_id:str,project:Project):
    try: UUID(project_id)
    except ValueError: raise HTTPException(400,'Invalid project identifier')
    require_database()
    if project.id!=project_id: raise HTTPException(400,'Project identifier mismatch')
    project.updated_at=datetime.now(timezone.utc).isoformat()
    doc=project.model_dump()
    await db.projects.update_one({'id':project_id},{'$set':doc},upsert=True)
    return project

@api.get('/projects/{project_id}',response_model=Project)
async def get_project(project_id:str):
    require_database()
    doc=await db.projects.find_one({'id':project_id},{'_id':0})
    if not doc: raise HTTPException(404,'Project not found')
    return doc

app.include_router(api)

@app.on_event('shutdown')
async def shutdown():
    if client is not None: client.close()