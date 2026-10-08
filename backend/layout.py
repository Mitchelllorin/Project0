from math import pi, sin, cos
from collections import defaultdict
from assembly import make_parts, H, D, T


def build_layout(config):
    cabinets=[]
    def add(cid,name,kind,width,x,z,rotation=0):
        cabinets.append(dict(id=cid,name=name,kind=kind,width=width,height=H,depth=width if kind=='corner' else D,position=[round(x,3),0,round(z,3)],rotation=rotation,parts=make_parts(width,kind)))
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


def dimensions(cabinets):
    xs,zs=[],[]
    for c in cabinets:
        for x,z in [(-c['width']/2,-c['depth']/2),(c['width']/2,-c['depth']/2),(c['width']/2,c['depth']/2),(-c['width']/2,c['depth']/2)]:
            xs.append(c['position'][0]+x*cos(c['rotation'])+z*sin(c['rotation']))
            zs.append(c['position'][2]-x*sin(c['rotation'])+z*cos(c['rotation']))
    # This template retains separate gables. No gable is silently removed on logical merge.
    return dict(run_length=round(sum(c['width'] for c in cabinets),1),footprint_width=round(max(xs)-min(xs),1),footprint_depth=round(max(zs)-min(zs),1),height=H,shared_gable_allowance=0,child_ids=[c['id'] for c in cabinets])


def adjacent(a,b):
    def bounds(c):
        w,d=(c['depth'],c['width']) if abs(sin(c['rotation']))>.7 else (c['width'],c['depth'])
        return c['position'][0]-w/2,c['position'][0]+w/2,c['position'][2]-d/2,c['position'][2]+d/2
    a0,a1,a2,a3=bounds(a);b0,b1,b2,b3=bounds(b)
    return (min(a1,b1)-max(a0,b0)>10 and min(abs(a3-b2),abs(b3-a2))<25) or (min(a3,b3)-max(a2,b2)>10 and min(abs(a1-b0),abs(b1-a0))<25)


def make_quote(cabinets,config):
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
    labor=round(len(cabinets)*2.5*config.quote.labor_rate,2) if config.quote.include_labor else 0
    finishing=round(len(cabinets)*{'oak':85,'walnut':125,'sage':95,'ivory':80,'charcoal':95}[config.finish]*(1.2 if config.style=='shaker' else 1.35 if config.style=='fluted' else 1),2) if config.quote.include_finish else 0
    return dict(lines=lines,subtotal=subtotal,labor=labor,finishing=finishing,total=round(subtotal+labor+finishing,2),currency='USD',illustrative=True)