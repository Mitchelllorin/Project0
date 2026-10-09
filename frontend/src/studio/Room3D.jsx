import React,{useMemo,useRef} from 'react';
import {Line} from '@react-three/drei';
import * as THREE from 'three';
import {Box} from './PartGeometry';
import {panelProps,surfaceProps,woodTexture} from './Materials';
import {RepeatedBoxes} from './RepeatedBoxes';

function Tube({points,radius=.013,color='#b9b9af'}) {
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),[points]);
  return <mesh castShadow><tubeGeometry args={[curve,32,radius,8,false]}/><meshStandardMaterial color={color} metalness={.8} roughness={.22}/></mesh>;
}
function Plant({position}) {
  return <group position={position}><mesh castShadow position={[0,.085,0]}><cylinderGeometry args={[.075,.05,.17,20]}/><meshStandardMaterial color="#b8a891" roughness={.9}/></mesh>{Array.from({length:9},(_,i)=><group key={i} rotation={[0,i*2.4,0]}><Tube points={[[0,.14,0],[.025,.26+i*.008,.01],[.055,.31+i*.008,0]]} radius={.003} color="#465740"/><mesh position={[.053,.31+i*.008,0]} rotation={[.3,0,-.8]} scale={[.025,.07,.014]}><sphereGeometry args={[1,8,8]}/><meshStandardMaterial color={i%2?'#526947':'#6f825b'} roughness={.8}/></mesh></group>)}</group>;
}
function Stool({position}) {
  const mat={color:'#b6a17d',map:woodTexture(),roughness:.6};
  return <group position={position}><mesh position={[0,.64,0]} castShadow><cylinderGeometry args={[.18,.17,.045,32]}/><meshStandardMaterial {...mat}/></mesh>{[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x}${z}`}><Box size={[.022,.61,.022]} position={[x*.115,.305,z*.115]} rotation={[z*.07,0,-x*.07]} material={{color:'#373a35',metalness:.6,roughness:.4}}/></group>))}<mesh rotation={[Math.PI/2,0,0]} position={[0,.24,0]}><torusGeometry args={[.14,.008,8,24]}/><meshStandardMaterial color="#373a35" metalness={.6}/></mesh></group>;
}
export function PotRack({type,onDismiss}) {
  const lastTap=useRef(null),down=useRef(null);
  const dismiss=e=>{e.stopPropagation();onDismiss();};
  const touchUp=e=>{
    if(e.pointerType!=='touch')return;
    e.stopPropagation();
    if(down.current&&Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)>12)return;
    const now=performance.now();
    if(lastTap.current&&now-lastTap.current.time<400&&Math.hypot(e.clientX-lastTap.current.x,e.clientY-lastTap.current.y)<20){lastTap.current=null;onDismiss();}
    else lastTap.current={time:now,x:e.clientX,y:e.clientY};
  };
  const brass=type==='brass';const mat={color:brass?'#b79c66':type==='wood'?'#9b7950':'#3e4540',metalness:type==='wood'?.05:.7,roughness:.4};
  return <group name="ceiling-pot-rack" position={[.93,2,2.05]} onDoubleClick={dismiss}>
    <mesh name="pot-rack-hit-area" position={[0,-.1,0]} onDoubleClick={dismiss} onPointerDown={e=>{down.current={x:e.clientX,y:e.clientY};}} onPointerUp={touchUp} userData={{testId:'pot-rack-hit-area'}}>
      <boxGeometry args={[1.03,.48,.57]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/>
    </mesh>
    {[-1,1].flatMap(x=>[-1,1].map(z=><Box key={`${x}${z}`} size={[.007,.6,.007]} position={[x*.42,.3,z*.18]} material={mat}/>))}
    {brass?<mesh rotation={[Math.PI/2,0,0]} scale={[1.6,1,1]}><torusGeometry args={[.29,.013,12,48]}/><meshStandardMaterial {...mat}/></mesh>:<>{[-1,1].map(s=><React.Fragment key={s}><Box size={[.94,.035,.025]} position={[0,0,s*.22]} material={mat}/><Box size={[.025,.035,.44]} position={[s*.46,0,0]} material={mat}/></React.Fragment>)}{Array.from({length:type==='grid'?7:3},(_,i)=><Box key={i} size={[.02,type==='wood'?.055:.015,.44]} position={[-.36+i*(type==='grid'?.12:.36),0,0]} material={mat}/>)}</>}
    {[-.3,0,.3].map((x,i)=><group key={x} position={[x,-.16,(i%2?.08:-.08)]}><mesh rotation={[0,0,Math.PI/2]} position={[0,.06,0]}><torusGeometry args={[.035,.004,6,16,Math.PI*1.5]}/><meshStandardMaterial {...mat}/></mesh><mesh castShadow position={[0,-.13,0]}><cylinderGeometry args={[.095,.09,.13,24,1,true]}/><meshStandardMaterial color={i===1?'#a77a50':'#737b76'} metalness={.85} roughness={.25} side={THREE.DoubleSide}/></mesh><mesh position={[0,-.196,0]}><cylinderGeometry args={[.09,.09,.005,24]}/><meshStandardMaterial color="#777d77" metalness={.7}/></mesh><Box size={[.018,.13,.018]} position={[0,0,0]} material={mat}/></group>)}
  </group>;
}
export function Room3D({config,cabinets,onCeilingToggle,onRackDismiss}) {
  const corner=cabinets.find(c=>c.kind==='corner');const back=cabinets.filter(c=>['B01','B02','B03'].includes(c.id));
  const backWidth=corner?corner.position[0]/1000+corner.width/2000:Math.max(...cabinets.filter(c=>c.position[2]<1000).map(c=>c.position[0]/1000+c.width/2000));
  const wall={color:config.lighting==='daylight'?'#cecec4':'#9e9a8b',roughness:.95};
  const tileMat={color:'#dadfd8',roughness:.4};
  const upperMat=panelProps(config,'finish');
  const sink=back[1];const hob=back[0];
  return <group>
    <Box size={[backWidth+.65,.065,3.75]} position={[backWidth/2-.15,-.035,1.45]} material={{color:'#b8b9b0',roughness:.95}}/>
    {Array.from({length:9},(_,i)=><Line key={`floor-x${i}`} points={[[-.47,.001,i*.44-.4],[backWidth+.16,.001,i*.44-.4]]} color="#a9aca4" lineWidth={.45}/>)}
    {Array.from({length:10},(_,i)=><Line key={`floor-z${i}`} points={[[i*.44-.45,.001,-.4],[i*.44-.45,.001,3.3]]} color="#a9aca4" lineWidth={.45}/>)}
    <Box size={[backWidth+.65,2.7,.09]} position={[backWidth/2-.15,1.35,-.075]} material={wall}/>
    {config.layout==='l-shape'&&<Box size={[.09,2.7,2.8]} position={[backWidth+.055,1.35,1.3]} material={wall}/>}
    {config.backsplash==='tile'&&<>
      <RepeatedBoxes instances={Array.from({length:5},(_,row)=>Array.from({length:Math.floor((backWidth+.3)/.205)},(_,col)=>({size:[.2,.096,.012],position:[-.12+col*.205+(row%2*.04),.965+row*.1,-.019]}))).flat()} material={tileMat}/>
      {config.layout==='l-shape'&&<RepeatedBoxes instances={Array.from({length:5},(_,row)=>Array.from({length:11},(_,col)=>({size:[.012,.096,.2],position:[backWidth-.005,.965+row*.1,.14+col*.205]}))).flat()} material={tileMat}/>}
    </>}
    {config.backsplash==='marble'&&<><Box size={[backWidth,.6,.02]} position={[backWidth/2,1.2,-.016]} material={surfaceProps({...config,countertop:'calacatta'})}/>{config.layout==='l-shape'&&<Box size={[.02,.6,2.35]} position={[backWidth-.005,1.2,1.175]} material={surfaceProps({...config,countertop:'calacatta'})}/>}</>}
    {back.slice(1).map((c,i)=><group key={c.id} position={[c.position[0]/1000,1.99,.17]}><Box size={[c.width/1000-.006,.76,.34]} material={upperMat}/>{[-1,1].map(s=><Box key={s} size={[c.width/2000-.004,.755,.019]} position={[s*c.width/4000,0,.181]} material={upperMat}/>)}<Box size={[c.width/1000-.02,.009,.28]} position={[0,-.386,0]} material={{color:'#fff0c5',emissive:'#ffe1a0',emissiveIntensity:.8}}/></group>)}
    {hob&&<group position={[hob.position[0]/1000,0,0]}><Box size={[.55,.009,.46]} position={[0,.917,.31]} material={{color:'#222724',metalness:.3,roughness:.17}}/>{[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={`${x}${z}`} position={[x*.135,.924,.31+z*.11]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.071,.073,32]}/><meshStandardMaterial color="#727c73" roughness={.4}/></mesh>))}<Box size={[.61,.095,.47]} position={[0,1.77,.2]} material={{color:'#4b5048',metalness:.6,roughness:.4}}/><Box size={[.31,.69,.26]} position={[0,2.15,.095]} material={{color:'#4b5048',metalness:.6,roughness:.4}}/></group>}
    {sink&&<group position={[sink.position[0]/1000,.916,.31]}><Box size={[.49,.009,.37]} material={{color:'#b2b8b1',metalness:.85,roughness:.23}}/><Box size={[.44,.011,.32]} position={[0,.004,0]} material={{color:'#737f76',metalness:.65,roughness:.25}}/><Box size={[.36,.012,.25]} position={[0,.006,0]} material={{color:'#55645d',metalness:.5,roughness:.4}}/><Tube points={[[.12,0,-.2],[.12,.24,-.2],[.12,.32,-.1],[.12,.25,.015]]} radius={.012} color={config.hardware==='brass'?'#bca171':'#aeb8b0'}/><Box size={[.018,.1,.018]} position={[.18,.05,-.2]} material={{color:'#a2aca3',metalness:.8}}/></group>}
    {corner&&<><Box size={[.027,.06,1.3]} position={[backWidth-.19,1.72,1.55]} material={upperMat}/><Box size={[.24,.045,1.3]} position={[backWidth-.12,1.72,1.55]} material={upperMat}/><Plant position={[backWidth-.2,.93,2.11]}/>{[0,1,2].map(i=><mesh key={i} position={[backWidth-.15,1.85,1.15+i*.16]} castShadow><cylinderGeometry args={[.046,.046,.19-i*.025,20]}/><meshStandardMaterial color={['#ddd8c8','#a8a68e','#758477'][i]} roughness={.8}/></mesh>)}</>}
    {config.island&&config.layout!=='galley'&&<><Stool position={[.55,0,2.7]}/><Stool position={[1.31,0,2.7]}/><group position={[.78,.94,2.05]}><mesh><sphereGeometry args={[.17,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2]}/><meshStandardMaterial color="#6e786d" side={THREE.DoubleSide}/></mesh>{[0,1,2].map(i=><mesh key={i} position={[(i-1)*.08,-.03,0]}><sphereGeometry args={[.057,16,12]}/><meshStandardMaterial color={i===1?'#aab177':'#baa05c'} roughness={.7}/></mesh>)}</group><Box size={[.31,.016,.22]} position={[1.48,.93,2.12]} rotation={[0,.2,0]} material={{color:'#b09367',map:woodTexture(),roughness:.8}}/></>}
    {config.rack!=='none'&&<PotRack type={config.rack} onDismiss={onRackDismiss}/>}
    {config.ceiling&&<mesh position={[backWidth/2,2.72,1.3]} rotation={[-Math.PI/2,0,0]} onDoubleClick={e=>{e.stopPropagation();onCeilingToggle();}}><planeGeometry args={[backWidth+.6,3.4]}/><meshStandardMaterial color="#cbd0c8" transparent opacity={config.ceiling_opacity} side={THREE.DoubleSide} depthWrite={false}/></mesh>}
  </group>;
}