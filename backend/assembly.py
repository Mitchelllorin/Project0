"""Generic Euro cabinet, in millimetres. Original geometry, no proprietary CAD.
All locations are cabinet-local, y up, front +z. Axes point in removal direction.
Children inherit their parent's displacement before their own stage separates.
"""
from math import pi, sqrt
from functools import lru_cache

T, BACK, H, D, TOE = 19.05, 6.35, 876.3, 609.6, 101.6


@lru_cache(maxsize=64)
def make_parts(width=762.0, kind='base'):
    parts = []

    def add(pid, name, category, pos, size, axis, parent=None, geometry='box', rotation=None, material=None, price=None, machining=None):
        mat = material or ('plywood' if category == 'panel' else 'steel')
        cost = price if price is not None else (max(size[0]*size[1], size[0]*size[2], size[1]*size[2]) / 1e6 * 82 if category == 'panel' else .18)
        part = dict(id=pid, name=name, category=category, position=pos, size=size,
                    assembly_axis=axis, assembly_order={'panel': 1, 'hardware': 2, 'fastener': 3}[category],
                    parent_id=parent, geometry=geometry, rotation=rotation or [0, 0, 0],
                    material=mat, price=round(cost, 2), travel={'panel': 330, 'hardware': 180, 'fastener': 170}[category], machining=machining or {})
        parts.append(part)
        return pid

    def screw(pid, pos, axis, parent, length=17):
        add(pid, 'Pozi mounting screw' if length == 17 else 'Confirmat carcass screw', 'fastener', pos, [4, length, 4], axis, parent, 'screw', price=.18)

    if kind == 'corner':
        s = width
        poly = [[-s/2,-s/2], [s/2,-s/2], [s/2,s/2], [s/2-D,s/2], [-s/2,-s/2+D]]
        add('bottom', 'Diagonal corner bottom', 'panel', [0,TOE+T/2,0], [s,T,s], [0,-1,0], geometry='corner', machining={'polygon':poly, 'dado_width_mm':T,'dado_depth_mm':9.525})
        add('shelf', 'Diagonal adjustable shelf', 'panel', [0,480,0], [s-2*T,T,s-2*T], [0,1,0], geometry='corner', machining={'polygon':[[x*.95,z*.95] for x,z in poly]})
        add('back', 'Corner rear gable', 'panel', [0,(H+TOE)/2,-s/2+T/2], [s,H-TOE,T], [0,0,-1])
        add('right', 'Corner return gable', 'panel', [s/2-T/2,(H+TOE)/2,0], [T,H-TOE,s-T], [1,0,0])
        add('left', 'Corner left wing', 'panel', [-s/2+T/2,(H+TOE)/2,-s/2+D/2], [T,H-TOE,D], [-1,0,0])
        add('return', 'Corner front wing', 'panel', [s/2-D/2,(H+TOE)/2,s/2-T/2], [D,H-TOE,T], [0,0,1])
        face = (s-D/2)/2
        door_w = sqrt(2)*(s-D)-4
        door_pos = [-D/2, (H+TOE)/2, D/2]
        add('door-1', '45° diagonal cabinet front', 'panel', door_pos, [door_w,H-TOE-4,T], [-.7071,0,.7071], geometry='door', rotation=[0,-pi/4,0], material='finish')
        add('pull-1', 'Diagonal bar pull', 'hardware', [door_pos[0]-20,H-115,door_pos[2]+20], [160,10,28], [-.7071,0,.7071], 'door-1', 'pull', rotation=[0,-pi/4,0], material='hardware', price=18)
        for j,y in enumerate([TOE+130,H-130]):
            pos=[-s/2+38,y,-s/2+D+14]
            add(f'hinge-{j}', '35 mm wide-angle cup hinge', 'hardware', pos, [35,60,35], [0,0,1], 'door-1', 'hinge', price=14.5)
            for k,dy in enumerate([-16,16]): screw(f'hinge-screw-{j}-{k}', [pos[0],y+dy,pos[2]+14], [0,0,1], f'hinge-{j}')
        for side in ['left','right','back','return']:
            p=next(p for p in parts if p['id']==side)
            for j,y in enumerate([TOE+T/2,H-35]):
                pos=list(p['position']); pos[1]=y
                screw(f'{side}-screw-{j}',pos,p['assembly_axis'],side,50)
        return parts

    for side, sign in [('left',-1),('right',1)]:
        add(side, f'{side.title()} machined gable', 'panel', [sign*(width-T)/2,(H+TOE)/2,0], [T,H-TOE,D], [sign,0,0], geometry='gable', machining={'dado_width_mm':T,'dado_depth_mm':9.525,'dado_y_mm':T/2,'rabbet_width_mm':BACK,'rabbet_depth_mm':9.525,'system_pitch_mm':32,'system_front_setback_mm':37,'system_hole_diameter_mm':5,'side':sign})
    add('bottom','Dado-seated bottom','panel',[0,TOE+T*1.5,0],[width-T,T,D-BACK],[0,-1,0],machining={'joint':'19.05 × 9.525 mm dado'})
    add('back','Rabbet-seated plywood back','panel',[0,(H+TOE)/2,-D/2+BACK/2],[width-T,H-TOE,BACK],[0,0,-1],machining={'joint':'6.35 × 9.525 mm rabbet'})
    for idx,z in enumerate([-D/2+55,D/2-55]):
        add(f'rail-{idx}','Top stretcher rail','panel',[0,H-T/2,z],[width-2*T,T,90],[0,1,0])
    add('toe','Recessed toe kick','panel',[0,TOE/2,D/2-75],[width-2*T,TOE,T],[0,0,1])
    if kind == 'drawers':
        for j in range(3):
            y=TOE+(H-TOE)*(j+.5)/3
            add(f'door-{j}','Drawer front','panel',[0,y,D/2+T/2],[width-3,(H-TOE)/3-3,T],[0,0,1],geometry='door',material='finish')
            add(f'drawer-floor-{j}','Drawer base','panel',[0,y-85,10],[width-85,12,D-80],[0,0,1],f'door-{j}')
            for side,sign in [('l',-1),('r',1)]:
                add(f'drawer-side-{j}-{side}','Drawer box side','panel',[sign*(width/2-38),y-30,10],[12,120,D-80],[sign,0,0],f'drawer-floor-{j}')
                sid=f'slide-{j}-{side}'
                add(sid,'Soft-close undermount slide','hardware',[sign*(width/2-42),y-95,0],[22,24,500],[sign,0,0],side=='l' and 'left' or 'right','slide',price=28)
                for k,z in enumerate([-200,0,200]): screw(f'{sid}-screw-{k}',[sign*(width/2-24),y-90,z],[sign,0,0],sid)
            add(f'drawer-back-{j}','Drawer box back','panel',[0,y-30,-D/2+55],[width-85,120,12],[0,0,-1],f'drawer-floor-{j}')
            add(f'pull-{j}','160 mm bar pull','hardware',[0,y+65,D/2+35],[160,10,28],[0,0,1],f'door-{j}','pull',material='hardware',price=18)
            for k,x in enumerate([-80,80]): screw(f'pull-{j}-screw-{k}',[x,y+65,D/2+7],[0,0,-1],f'pull-{j}')
    else:
        add('shelf','Adjustable interior shelf','panel',[0,470,8],[width-2*T-2,T,D-35],[0,1,0])
        for j,sign in enumerate([-1,1]):
            x=sign*width/4
            add(f'door-{j}','Full-overlay cabinet door','panel',[x,(H+TOE)/2,D/2+T/2],[width/2-3,H-TOE-4,T],[0,0,1],geometry='door',material='finish')
            add(f'pull-{j}','160 mm bar pull','hardware',[sign*40,H-115,D/2+35],[10,160,28],[0,0,1],f'door-{j}','pull',material='hardware',price=18)
            for k,y in enumerate([H-195,H-35]): screw(f'pull-{j}-screw-{k}',[sign*40,y,D/2+7],[0,0,-1],f'pull-{j}')
            for k,y in enumerate([TOE+130,H-130]):
                hid=f'hinge-{j}-{k}'
                add(hid,'35 mm European cup hinge','hardware',[sign*(width/2-23),y,D/2-8],[35,60,35],[0,0,-1],f'door-{j}','hinge',price=9.5,machining={'cup_diameter_mm':35,'cup_depth_mm':13,'system_pitch_mm':32,'front_setback_mm':37})
                for l,dy in enumerate([-16,16]):
                    screw(f'{hid}-cup-{l}',[sign*(width/2-23),y+dy,D/2+2],[0,0,-1],hid)
                    screw(f'{hid}-plate-{l}',[sign*(width/2-T-3),y+dy,D/2-37],[-sign,0,0],hid)
    for side,sign in [('left',-1),('right',1)]:
        for j,y in enumerate([TOE+T*1.5,H-T/2]):
            for k,z in enumerate([-D/2+55,D/2-55]):
                screw(f'carcass-{side}-{j}-{k}',[sign*(width/2+1),y,z],[sign,0,0],side,50)
        for j,y in enumerate([470-T/2]):
            for k,z in enumerate([-D/2+50,D/2-37]):
                add(f'pin-{side}-{j}-{k}','5 mm shelf support pin','fastener',[sign*(width/2-T-4),y,z],[5,12,5],[-sign,0,0],side,'screw',price=.35)
    return parts