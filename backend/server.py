from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from uuid import UUID
import os
from models import Configuration, SceneResponse, GroupRequest, Project, CatalogItem, ProductAssembly
from layout import build_layout, dimensions, make_quote, adjacent
from assembly import make_parts

load_dotenv(Path(__file__).parent / '.env')
client=AsyncIOMotorClient(os.environ['MONGO_URL'])
db=client[os.environ['DB_NAME']]
app=FastAPI(title='Kitchen Studio Assembly API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=os.environ['CORS_ORIGINS'].split(','),allow_credentials=False,allow_methods=['*'],allow_headers=['*'])
api=APIRouter(prefix='/api')

@app.on_event('startup')
async def seed_catalog():
    for kind in ['base','drawers','corner']:
        await db.products.update_one({'id':f'euro-{kind}'},{'$set':{'id':f'euro-{kind}','name':f'Euro 32 / {kind}','kind':kind,'width':914.4 if kind=='corner' else 762,'parts':make_parts(914.4 if kind=='corner' else 762,kind),'standard':'Original generic frameless Euro/32 mm template','sources':['https://publications.blum.com/2024/catalogue/en/153/'],'revision':'1.0'}},upsert=True)

@api.get('/')
async def root(): return {'name':'Kitchen Studio Assembly API','version':'1.0.0'}

@api.get('/catalog',response_model=list[CatalogItem])
async def catalog():
    return await db.products.find({}, {'_id':0,'parts':0}).to_list(20)

@api.post('/configure',response_model=SceneResponse)
async def configure(config:Configuration):
    cabinets=build_layout(config)
    counts={k:sum(1 for c in cabinets for p in c['parts'] if p['category']==k) for k in ['panel','hardware','fastener']}
    return dict(cabinets=cabinets,quote=make_quote(cabinets,config),dimensions=dimensions(cabinets),counts=counts)

@api.get('/assemblies/{product_id}',response_model=ProductAssembly)
async def assembly(product_id:str):
    result=await db.products.find_one({'id':product_id},{'_id':0})
    if not result: raise HTTPException(404,'Assembly not found')
    return result

@api.post('/groups/preview')
async def group_preview(request:GroupRequest):
    ids=list(dict.fromkeys(request.cabinet_ids))
    cabinets=[c for c in build_layout(request.configuration) if c['id'] in ids]
    if len(ids)<2 or len(cabinets)!=len(ids): raise HTTPException(400,'Select at least two existing cabinets')
    reached={cabinets[0]['id']}
    for _ in cabinets:
        for a in cabinets:
            if a['id'] in reached:
                reached.update(b['id'] for b in cabinets if adjacent(a,b))
    if len(reached)!=len(cabinets): raise HTTPException(400,'Only neighboring cabinets can be merged')
    return {**dimensions(cabinets),'parts_count':sum(len(c['parts']) for c in cabinets),'geometry_fused':False}

@api.put('/projects/{project_id}',response_model=Project)
async def save_project(project_id:str,project:Project):
    try: UUID(project_id)
    except ValueError: raise HTTPException(400,'Invalid project identifier')
    if project.id!=project_id: raise HTTPException(400,'Project identifier mismatch')
    project.updated_at=datetime.now(timezone.utc).isoformat()
    doc=project.model_dump()
    await db.projects.update_one({'id':project_id},{'$set':doc},upsert=True)
    return project

@api.get('/projects/{project_id}',response_model=Project)
async def get_project(project_id:str):
    doc=await db.projects.find_one({'id':project_id},{'_id':0})
    if not doc: raise HTTPException(404,'Project not found')
    return doc

app.include_router(api)

@app.on_event('shutdown')
async def shutdown(): client.close()