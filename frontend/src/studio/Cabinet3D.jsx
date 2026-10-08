import React,{useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Line} from '@react-three/drei';
import * as THREE from 'three';
import {explodedPosition} from './engine';
import {PartGeometry,Box} from './PartGeometry';
import {surfaceProps} from './Materials';

function AnimatedPart({part,parts,amount,config,selected,inspect,onInspect,detail}) {
  const ref=useRef();const target=useMemo(()=>new THREE.Vector3(...explodedPosition(part,parts,amount)),[part,parts,amount]);
  useFrame((state,delta)=>{if(ref.current){ref.current.position.lerp(target,1-Math.exp(-delta*9));if(ref.current.position.distanceToSquared(target)>.000001)state.invalidate();}});
  return <group ref={ref} position={part.position.map(n=>n/1000)} rotation={part.rotation} onClick={e=>{e.stopPropagation();onInspect(part.id);}}><PartGeometry part={part} config={config} highlight={inspect===part.id} detail={detail}/></group>;
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
  const click=e=>{e.stopPropagation();if(all[e.instanceId])onInspect(all[e.instanceId].id);};
  return <><instancedMesh ref={ref} args={[null,null,all.length]} onClick={click}><cylinderGeometry args={[.5,.35,1,8]}/><meshStandardMaterial metalness={.8} roughness={.27}/></instancedMesh><instancedMesh ref={heads} args={[null,null,all.length]} onClick={click}><cylinderGeometry args={[.5,.3,1,10]}/><meshStandardMaterial metalness={.8} roughness={.27}/></instancedMesh></>;
}

function CornerCounter({cabinet,config}) {
  const p=cabinet.parts.find(p=>p.geometry==='corner');
  return <group position={[0,.895,0]}><PartGeometry part={{...p,size:[p.size[0],35,p.size[2]],material:'surface'}} config={config}/></group>;
}

export function Cabinet3D({cabinet,config,amount=0,selected=false,assembly=false,inspected,onSelect,onInspect}) {
  const w=cabinet.width/1000,d=cabinet.depth/1000;
  const detail=assembly||selected;
  const inspect=inspected?.cabinetId===cabinet.id?inspected.partId:null;
  return <group position={cabinet.position.map(n=>n/1000)} rotation={[0,cabinet.rotation,0]} onClick={e=>{e.stopPropagation();onSelect(cabinet.id);}}>
    {cabinet.parts.filter(p=>(p.category==='panel'&&(detail||!['shelf','drawer-floor','drawer-side','drawer-back'].some(prefix=>p.id.startsWith(prefix))))||p.geometry==='pull'||(detail&&p.category==='hardware')).map(p=><AnimatedPart key={p.id} part={p} parts={cabinet.parts} amount={amount} config={config} inspect={inspect} detail={detail} onInspect={pid=>assembly?onInspect({cabinetId:cabinet.id,partId:pid}):onSelect(cabinet.id)}/>)}
    {detail&&<Fasteners parts={cabinet.parts} amount={amount} inspect={inspect} onInspect={pid=>onInspect({cabinetId:cabinet.id,partId:pid})}/>}
    {!assembly&&(cabinet.kind==='corner'?<CornerCounter cabinet={cabinet} config={config}/>:<Box size={[w+.002,.035,d+.044]} position={[0,.895,.012]} material={surfaceProps(config)}/>)}
    {selected&&!assembly&&<Line points={[[-w/2,.007,-d/2],[w/2,.007,-d/2],[w/2,.007,d/2+.04],[-w/2,.007,d/2+.04],[-w/2,.007,-d/2]]} color={config.accent||'#dca55e'} lineWidth={2}/>}
    {inspect&&amount>0&&(()=>{const p=cabinet.parts.find(p=>p.id===inspect);return p?<Line points={[p.position.map(n=>n/1000),explodedPosition(p,cabinet.parts,amount)]} color="#dca55e" lineWidth={1} dashed dashSize={.025} gapSize={.02}/>:null;})()}
  </group>;
}