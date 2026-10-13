from math import pi, sin, cos
from collections import defaultdict
from assembly import make_parts
from recipe import load_catalog, fuse_run

DEFAULT_CATALOG = load_catalog('euro32')


def build_layout(config, catalog=None):
    cat=catalog or DEFAULT_CATALOG
    H,D=cat.H,cat.D
    placements=getattr(config,'placements',None)
    if getattr(config,'custom',False) and placements:
        # Family display names come from the catalog, so a new manufacturer renames its
        # own products without touching layout code.
        names={kind:family['name'] for kind,family in cat.families.items()}
        return [dict(id=p.id,name=names.get(p.kind,'Base cabinet'),kind=p.kind,width=p.width,height=H,
                     depth=p.width if p.kind=='corner' else D,
                     position=[round(p.x,3),0,round(p.z,3)],rotation=p.rotation,parts=make_parts(p.width,p.kind,cat))
                for p in placements]
    cabinets=[]
    def add(cid,name,kind,width,x,z,rotation=0):
        cabinets.append(dict(id=cid,name=name,kind=kind,width=width,height=H,depth=width if kind=='corner' else D,position=[round(x,3),0,round(z,3)],rotation=rotation,parts=make_parts(width,kind,cat)))
    widths=[config.widths.get('B01',762),config.widths.get('B02',914.4),config.widths.get('B03',762)]
    x=0
    for i,w in enumerate(widths):
        add(f'B0{i+1}',['Drawer base','Sink base','Double-door base'][i], 'drawers' if i==0 else 'base',w,x+w/2,D/2)
        x+=w
    if config.layout=='l-shape':
        s=914.4
        add('C01','Diagonal corner','corner',s,x+s/2,s/2)
        z=s
        for cid in ['B04','B05']:
            w=config.widths.get(cid,762)
            add(cid,'Return base','base',w,x+s-D/2,z+w/2,-pi/2)
            z+=w
    elif config.layout=='straight':
        w=config.widths.get('B04',762)
        add('B04','Double-door base','base',w,x+w/2,D/2)
    else:
        xx=0
        for cid in ['B04','B05']:
            w=config.widths.get(cid,762)
            add(cid,'Galley base','base',w,xx+w/2,2300,pi)
            xx+=w
    if config.island and config.layout!='galley':
        for i,cid in enumerate(['I01','I02']):
            add(cid,'Island base','base',762,550+i*762,2050)
    return cabinets


def apply_runs(cabinets, groups, catalog=None):
    """Replace each declared run's duplicated joint gables with one shared partition.

    Returns `(reports, joints)`, where `joints` is how many carcasses the run
    stopped being — the number the labour line is charged on. This is the only
    place a merge changes a cut list, and it changes nothing at all for a cabinet
    that is not in a group, so an ungrouped configuration is priced and cut
    exactly as it was.
    """
    cat = catalog or DEFAULT_CATALOG
    by_id = {c['id']: c for c in cabinets}
    reports, joints = [], 0
    for group in groups or []:
        members = [by_id[i] for i in group if i in by_id]
        ids = [m['id'] for m in members]
        if len(members) < 2:
            continue
        if any(m['kind'] == 'corner' for m in members):
            reports.append({'ids': ids, 'fused': False, 'reason': 'a corner cabinet has no gable to share'})
            continue
        if len({round(m['rotation'] % (2 * pi), 4) for m in members}) != 1:
            reports.append({'ids': ids, 'fused': False, 'reason': 'a run has to face one way'})
            continue
        angle = members[0]['rotation']
        # Local +x maps to (cos, -sin) in world space, the same convention dimensions() uses.
        ux, uz = cos(angle), -sin(angle)
        ordered = sorted(members, key=lambda m: m['position'][0] * ux + m['position'][2] * uz)
        along = [m['position'][0] * ux + m['position'][2] * uz for m in ordered]
        if not all(adjacent(ordered[i], ordered[i + 1]) for i in range(len(ordered) - 1)):
            reports.append({'ids': ids, 'fused': False, 'reason': 'only neighbouring cabinets in one line form a run'})
            continue
        offsets = [round(value - along[0], 3) for value in along]
        parts_by_member, report = fuse_run(cat, [
            {'id': m['id'], 'width': m['width'], 'offset': offsets[i], 'parts': m['parts']}
            for i, m in enumerate(ordered)])
        report['ids'] = [m['id'] for m in ordered]
        if parts_by_member is None:
            reports.append(report)
            continue
        for member, parts in zip(ordered, parts_by_member):
            member['parts'] = parts
        joints += report['joints']
        reports.append(report)
    return reports, joints


def dimensions(cabinets, catalog=None, shared_gables=0):
    xs,zs=[],[]
    for c in cabinets:
        for x,z in [(-c['width']/2,-c['depth']/2),(c['width']/2,-c['depth']/2),(c['width']/2,c['depth']/2),(-c['width']/2,c['depth']/2)]:
            xs.append(c['position'][0]+x*cos(c['rotation'])+z*sin(c['rotation']))
            zs.append(c['position'][2]-x*sin(c['rotation'])+z*cos(c['rotation']))
    # `shared_gables` counts the joint gables a fused run deleted. It is not an
    # allowance held back from the gables above — those are already gone from the
    # cut list this is reporting on — it is the count of what a merge removed,
    # published so a shop can see the saving rather than take it on trust.
    return dict(run_length=round(sum(c['width'] for c in cabinets),1),footprint_width=round(max(xs)-min(xs),1),footprint_depth=round(max(zs)-min(zs),1),height=(catalog or DEFAULT_CATALOG).H,shared_gable_allowance=shared_gables,child_ids=[c['id'] for c in cabinets])


def adjacent(a,b):
    def bounds(c):
        w,d=(c['depth'],c['width']) if abs(sin(c['rotation']))>.7 else (c['width'],c['depth'])
        return c['position'][0]-w/2,c['position'][0]+w/2,c['position'][2]-d/2,c['position'][2]+d/2
    a0,a1,a2,a3=bounds(a);b0,b1,b2,b3=bounds(b)
    return (min(a1,b1)-max(a0,b0)>10 and min(abs(a3-b2),abs(b3-a2))<25) or (min(a3,b3)-max(a2,b2)>10 and min(abs(a1-b0),abs(b1-a0))<25)


def make_quote(cabinets,config,dealer=None,assemblies=None):
    # `dealer` is a signed-in dealer's view (id, name, tier, tier_name, discount) or None for
    # list pricing. It arrives already resolved by the server: this function never sees an
    # access code and never accepts a discount from the request body.
    grouped=defaultdict(lambda:dict(quantity=0,total=0))
    for c in cabinets:
        for p in c['parts']:
            if p['category']!='panel' and not config.quote.include_hardware: continue
            key=(p['name'],p['category'],p['price'])
            grouped[key]['quantity']+=1
            grouped[key]['total']+=p['price']
    lines=[]
    for i,((name,cat,price),v) in enumerate(grouped.items()):
        lines.append(dict(key=f'part-{i}',name=name,category=cat,unit_price=price,quantity=v['quantity'],total=round(v['total'],2)))
    area=sum(c['width']*c['depth'] for c in cabinets)/1e6
    stone_price={'calacatta':280,'concrete':170,'noir':250}[config.countertop]*(1.15 if config.surface=='polished' else 1)
    lines.append(dict(key='countertops',name=config.countertop.title()+' countertops',category='surface',quantity=1,unit_price=round(area*stone_price,2),total=round(area*stone_price,2)))
    if config.backsplash!='none':
        cost=round(sum(c['width'] for c in cabinets if not c['id'].startswith('I'))*.00055*(65 if config.backsplash=='tile' else 185),2)
        lines.append(dict(key='backsplash',name=config.backsplash.title()+' backsplash',category='surface',quantity=1,unit_price=cost,total=cost))
    if config.rack!='none':
        cost={'steel':240,'wood':320,'brass':390,'grid':280}[config.rack]
        lines.append(dict(key='rack',name=config.rack.title()+' ceiling pot rack',category='accessory',quantity=1,unit_price=cost,total=cost))
    subtotal=round(sum(l['total'] for l in lines),2)
    # Labour is charged on carcasses to assemble, not on bays: a fused run is one box.
    bodies=len(cabinets) if assemblies is None else assemblies
    labor=round(bodies*2.5*config.quote.labor_rate,2) if config.quote.include_labor else 0
    # Finishing stays per bay: a fused run still has every front it had before.
    finishing=round(len(cabinets)*{'oak':85,'walnut':125,'sage':95,'ivory':80,'charcoal':95}[config.finish]*(1.2 if config.style=='shaker' else 1.35 if config.style=='fluted' else 1),2) if config.quote.include_finish else 0
    list_total=round(subtotal+labor+finishing,2)
    quote=dict(lines=lines,subtotal=subtotal,labor=labor,finishing=finishing,total=list_total,currency='USD',illustrative=True)
    if dealer is None:
        return quote
    # The trade discount is on what the manufacturer supplies; the dealer's own labour and
    # finishing are theirs at cost. Both are shown, so the margin is never a guess.
    cost_materials=round(subtotal*(1-dealer.discount),2)
    cost_total=round(cost_materials+labor+finishing,2)
    resale=getattr(config.quote,'resale_discount',0) or 0
    client_total=round(list_total*(1-resale),2)
    margin=round(client_total-cost_total,2)
    quote['price_tier']=dict(tier=dealer.tier,tier_name=dealer.tier_name,discount=dealer.discount,
        list_total=list_total,cost_materials=cost_materials,cost_total=cost_total,
        client_total=client_total,margin=margin,margin_pct=round(margin/client_total,4) if client_total else 0.0,
        currency='USD')
    return quote