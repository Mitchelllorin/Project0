import React,{useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Line,useCursor} from '@react-three/drei';
import * as THREE from 'three';
import {explodedPosition} from './engine';
import {PartGeometry,Box} from './PartGeometry';
import {surfaceProps} from './Materials';
import {onTap} from './pointer';

function AnimatedPart({part,parts,amount,config,selected,inspect,onInspect,detail,open}) {
  const ref=useRef(),swing=useRef();
  const [hovered,setHovered]=useState(false);useCursor(hovered);
  // Doors swing on their outer hinge edge; drawer fronts and drawer boxes slide forward.
  const isDrawer=/^drawer-/.test(part.id)||part.name.toLowerCase().includes('drawer');
  const slide=useMemo(()=>open&&isDrawer?[0,0,420]:[0,0,0],[open,isDrawer]); // whole drawer unit moves together
  const target=useMemo(()=>{const p=explodedPosition(part,parts,amount);return new THREE.Vector3(p[0]+slide[0]/1000,p[1]+slide[1]/1000,p[2]+slide[2]/1000);},[part,parts,amount,slide]);
  const doorSign=part.position[0]<0?-1:1;
  const swingAngle=useMemo(()=>open&&part.geometry==='door'&&!isDrawer?doorSign*105*Math.PI/180:0,[open,part.geometry,isDrawer,doorSign]);
  const pivot=[doorSign*part.size[0]/2000,0,0];
  useFrame((state,delta)=>{
    if(ref.current){ref.current.position.lerp(target,1-Math.exp(-delta*9));if(ref.current.position.distanceToSquared(target)>.000001)state.invalidate();}
    if(swing.current){swing.current.rotation.y=THREE.MathUtils.lerp(swing.current.rotation.y,swingAngle,1-Math.exp(-delta*8));if(Math.abs(swing.current.rotation.y-swingAngle)>.001)state.invalidate();}
  });
  return <group ref={ref} position={part.position.map(n=>n/1000)} rotation={part.rotation} onPointerOver={e=>{e.stopPropagation();if(e.pointerType!=='touch')setHovered(true);}} onPointerOut={e=>{e.stopPropagation();setHovered(false);}} onClick={onTap(e=>{e.stopPropagation();onInspect(part.id);})}><group ref={swing} position={pivot}><group position={[-pivot[0],0,0]}><PartGeometry part={part} config={config} highlight={inspect===part.id||hovered} detail={detail}/></group></group></group>;
}

function Fasteners({parts,amount,inspect,onInspect}) {
  const ref=useRef(),heads=useRef();const all=useMemo(()=>parts.filter(p=>p.category==='fastener'),[parts]);
  const obj=useMemo(()=>new THREE.Object3D(),[]);const smooth=useRef(0);const up=useMemo(()=>new THREE.Vector3(0,1,0),[]);
  useFrame((state,delta)=>{
    smooth.current=THREE.MathUtils.lerp(smooth.current,amount,1-Math.exp(-delta*9));
    if(Math.abs(smooth.current-amount)>.001)state.invalidate();
    if(!ref.current||!heads.current)return;
    all.forEach((p,i)=>{
      const axis=new THREE.Vector3(...p.assembly_axis).normalize();
      const pos=new THREE.Vector3(...explodedPosition(p,parts,smooth.current));
      obj.quaternion.setFromUnitVectors(up,axis);obj.position.copy(pos).addScaledVector(axis,-p.size[1]/2000);obj.scale.set(p.size[0]/1000,p.size[1]/1000,p.size[0]/1000);obj.updateMatrix();ref.current.setMatrixAt(i,obj.matrix);
      obj.position.copy(pos);obj.scale.set(p.size[0]/1000*1.8,.0025,p.size[0]/1000*1.8);obj.updateMatrix();heads.current.setMatrixAt(i,obj.matrix);
      const color=new THREE.Color(inspect===p.id?'#ffb94f':'#aab4b2');ref.current.setColorAt(i,color);heads.current.setColorAt(i,color);
    });
    ref.current.instanceMatrix.needsUpdate=true;heads.current.instanceMatrix.needsUpdate=true;
    if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;if(heads.current.instanceColor)heads.current.instanceColor.needsUpdate=true;
  });
  const click=onTap(e=>{e.stopPropagation();if(all[e.instanceId])onInspect(all[e.instanceId].id);});
  return <><instancedMesh ref={ref} args={[null,null,all.length]} onClick={click}><cylinderGeometry args={[.5,.35,1,8]}/><meshStandardMaterial metalness={.8} roughness={.27}/></instancedMesh><instancedMesh ref={heads} args={[null,null,all.length]} onClick={click}><cylinderGeometry args={[.5,.3,1,10]}/><meshStandardMaterial metalness={.8} roughness={.27}/></instancedMesh></>;
}

function CornerCounter({cabinet,config}) {
  const p=cabinet.parts.find(p=>p.geometry==='corner');
  return <group position={[0,.895,0]}><PartGeometry part={{...p,size:[p.size[0],35,p.size[2]],material:'surface'}} config={config}/></group>;
}

export function Cabinet3D({cabinet,config,amount=0,selected=false,assembly=false,inspected,onSelect,onInspect,onOpenAssembly,open=false}) {
  const w=cabinet.width/1000,d=cabinet.depth/1000;
  const detail=assembly||selected;
  const inspect=inspected?.cabinetId===cabinet.id?inspected.partId:null;
  const [hovered,setHovered]=useState(false);useCursor(hovered);
  return <group position={cabinet.position.map(n=>n/1000)} rotation={[0,cabinet.rotation,0]} onPointerOver={e=>{e.stopPropagation();if(e.pointerType!=='touch')setHovered(true);}} onPointerOut={e=>{e.stopPropagation();setHovered(false);}} onClick={onTap(e=>{e.stopPropagation();onSelect(cabinet.id);})} onDoubleClick={onTap(e=>{e.stopPropagation();if(onOpenAssembly)onOpenAssembly();})}>
    {cabinet.parts.filter(p=>(p.category==='panel'&&(detail||open||!['shelf','drawer-floor','drawer-side','drawer-back'].some(prefix=>p.id.startsWith(prefix))))||p.geometry==='pull'||(detail&&p.category==='hardware')).map(p=><AnimatedPart key={p.id} part={p} parts={cabinet.parts} amount={amount} config={config} inspect={inspect} detail={detail} open={open} onInspect={pid=>assembly?onInspect({cabinetId:cabinet.id,partId:pid}):onSelect(cabinet.id)}/>)}
    {detail&&<Fasteners parts={cabinet.parts} amount={amount} inspect={inspect} onInspect={pid=>onInspect({cabinetId:cabinet.id,partId:pid})}/>}
    {!assembly&&(cabinet.kind==='corner'?<CornerCounter cabinet={cabinet} config={config}/>:<Box size={[w+.002,.035,d+.044]} position={[0,.895,.012]} material={surfaceProps(config)}/>)}
    {(selected||hovered)&&!assembly&&<Line points={[[-w/2,.007,-d/2],[w/2,.007,-d/2],[w/2,.007,d/2+.04],[-w/2,.007,d/2+.04],[-w/2,.007,-d/2]]} color={selected?(config.accent||'#dca55e'):'#93a7c4'} lineWidth={selected?2:1}/>}
    {inspect&&amount>0&&(()=>{const p=cabinet.parts.find(p=>p.id===inspect);return p?<Line points={[p.position.map(n=>n/1000),explodedPosition(p,cabinet.parts,amount)]} color="#dca55e" lineWidth={1} dashed dashSize={.025} gapSize={.02}/>:null;})()}
  </group>;
}