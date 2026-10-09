import React, {useMemo,useRef,useLayoutEffect} from 'react';
// Mark this module as custom-reconciler JSX: DOM edit markers must not enter meshes.
import '@react-three/fiber';
import * as THREE from 'three';
import {panelProps} from './Materials';

export function Box({size,position=[0,0,0],material, ...props}) {
  return <mesh castShadow receiveShadow position={position} {...props}><boxGeometry args={size}/><meshStandardMaterial {...material}/></mesh>;
}
function CornerShape({part,material}) {
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape();const pts=part.machining.polygon;shape.moveTo(pts[0][0]/1000,-pts[0][1]/1000);
    pts.slice(1).forEach(p=>shape.lineTo(p[0]/1000,-p[1]/1000));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:part.size[1]/1000,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,-part.size[1]/2000,0);return g;
  },[part]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial {...material}/></mesh>;
}
function Gable({part,material,detail}) {
  const [w,h,d]=part.size.map(n=>n/1000),sign=part.machining.side,half=w/2;
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape();const outer=sign*half,inner=-sign*half;
    shape.moveTo(outer,-d/2);shape.lineTo(outer,d/2);shape.lineTo(inner,d/2);shape.lineTo(inner,-d/2+.00635);shape.lineTo(inner+sign*.009525,-d/2+.00635);shape.lineTo(inner+sign*.009525,-d/2);shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:h-.0381,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,h/2,0);return g;
  },[h,d,sign,half]);
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial {...material}/></mesh>
    <Box size={[w,.01905,d]} position={[0,-h/2+.009525,0]} material={material}/>
    <Box size={[w/2,.01905,d]} position={[sign*w/4,-h/2+.028575,0]} material={material}/>
    {detail&&<SystemHoles w={w} d={d} sign={sign}/>}
  </group>;
}
function SystemHoles({w,d,sign}) {
  const mesh=useRef();
  useLayoutEffect(()=>{
    const o=new THREE.Object3D();o.rotation.set(0,Math.PI/2,0);
    for(let i=0;i<21;i++)[-d/2+.05,d/2-.037].forEach((z,j)=>{o.position.set(-sign*(w/2+.0001),-.28+i*.032,z);o.updateMatrix();mesh.current.setMatrixAt(i*2+j,o.matrix);});
    mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();
  },[w,d,sign]);
  return <instancedMesh ref={mesh} args={[null,null,42]}><circleGeometry args={[.0025,7]}/><meshBasicMaterial color="#514334" side={THREE.DoubleSide}/></instancedMesh>;
}
function Hinge({material}) {
  return <group><mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.0175,.0175,.013,20,1,true]}/><meshStandardMaterial {...material} side={THREE.DoubleSide}/></mesh><Box size={[.05,.057,.003]} position={[0,0,-.007]} material={material}/><Box size={[.014,.025,.048]} position={[0,0,-.028]} material={material}/><Box size={[.026,.052,.004]} position={[0,0,-.053]} material={material}/><mesh position={[0,0,-.057]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.005,.005,.004,12]}/><meshStandardMaterial {...material}/></mesh></group>;
}
export function DetailedScrew({size,material}) {
  const length=size[1]/1000,r=size[0]/2000;
  return <group><mesh position={[0,-length/2,0]}><cylinderGeometry args={[r*.75,r*.35,length,12]}/><meshStandardMaterial {...material}/></mesh><mesh><cylinderGeometry args={[r*1.9,r,.0025,16]}/><meshStandardMaterial {...material}/></mesh>{Array.from({length:9},(_,i)=><mesh key={i} position={[0,-.002-i*(length-.003)/9,0]} rotation={[Math.PI/2,.12,0]}><torusGeometry args={[r,.00035,4,12]}/><meshStandardMaterial {...material}/></mesh>)}<Box size={[r*2.5,.0002,.0005]} position={[0,.0013,0]} material={{color:'#303331'}}/><Box size={[.0005,.0002,r*2.5]} position={[0,.0013,0]} material={{color:'#303331'}}/></group>;
}
export function PartGeometry({part,config,highlight=false,detail=false}) {
  const size=part.size.map(n=>n/1000);
  const mat={...panelProps(config,part.material),...(highlight?{emissive:'#dca55e',emissiveIntensity:.35}:{})};
  if(part.geometry==='corner')return <CornerShape part={part} material={mat}/>;
  if(part.geometry==='gable')return <Gable part={part} material={mat} detail={detail}/>;
  if(part.geometry==='hinge')return <Hinge material={mat}/>;
  if(part.geometry==='screw')return <DetailedScrew size={part.size} material={mat}/>;
  if(part.geometry==='slide')return <group><Box size={size} material={mat}/><Box size={[size[0]*.5,size[1]*.4,size[2]*.92]} position={[0,.014,.02]} material={{...mat,color:'#d5dad7'}}/><Box size={[.02,.012,.09]} position={[0,.02,.19]} material={{color:'#737b76'}}/></group>;
  if(part.geometry==='pull'){
    const vertical=size[1]>size[0];return <group><Box size={[size[0],size[1],.01]} position={[0,0,.014]} material={mat}/>{[-1,1].map(s=><Box key={s} size={[.009,.009,.023]} position={[vertical?0:s*size[0]*.43,vertical?s*size[1]*.43:0,0]} material={mat}/>)}</group>;
  }
  if(part.geometry==='door'&&config.style==='shaker')return <group><Box size={[size[0]-.085,size[1]-.085,.009]} position={[0,0,-.004]} material={mat}/>{[-1,1].map(s=><React.Fragment key={s}><Box size={[.045,size[1],size[2]]} position={[s*(size[0]-.045)/2,0,0]} material={mat}/><Box size={[size[0]-.09,.045,size[2]]} position={[0,s*(size[1]-.045)/2,0]} material={mat}/></React.Fragment>)}</group>;
  if(part.geometry==='door'&&config.style==='fluted')return <group><Box size={size} material={mat}/>{Array.from({length:Math.floor(size[0]/.025)},(_,i)=><Box key={i} size={[.013,size[1],.007]} position={[-size[0]/2+.0125+i*.025,0,size[2]/2]} material={mat}/>)}</group>;
  return <Box size={size} material={mat}/>;
}