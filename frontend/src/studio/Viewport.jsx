import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useThree,useFrame} from '@react-three/fiber';
import {OrbitControls,Environment,Lightformer,ContactShadows,Line} from '@react-three/drei';
import {Box as BoxIcon,RotateCcw,Maximize,Camera,MoveUpRight,Grid2X2,Sun,Moon,Plus,Minus,Focus,Layers,Check,Eye,EyeOff,X} from 'lucide-react';
import {useStudio} from './StudioContext';
import {Cabinet3D} from './Cabinet3D';
import {Room3D} from './Room3D';
import {formatDimension} from './engine';
import {Button} from '../components/ui/button';
import {toast} from 'sonner';
import * as THREE from 'three';

function TouchGestures({onRackDismiss}) {
  const {gl,camera,scene}=useThree();
  const callback=useRef(onRackDismiss);callback.current=onRackDismiss;
  useEffect(()=>{
    let last=null,start=null;
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
    const down=event=>{if(event.pointerType==='touch')start={x:event.clientX,y:event.clientY};};
    const up=event=>{
      if(event.pointerType!=='touch'||!start||Math.hypot(event.clientX-start.x,event.clientY-start.y)>15)return;
      const rack=scene.getObjectByName('pot-rack-hit-area');
      if(!rack){last=null;return;}
      const rect=gl.domElement.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);
      if(!ray.intersectObject(rack).length){last=null;return;}
      const time=performance.now();
      if(last&&time-last.time<550&&Math.hypot(event.clientX-last.x,event.clientY-last.y)<25){last=null;callback.current();}
      else last={time,x:event.clientX,y:event.clientY};
    };
    const element=gl.domElement;
    element.addEventListener('pointerdown',down,true);element.addEventListener('pointerup',up,true);
    return()=>{element.removeEventListener('pointerdown',down,true);element.removeEventListener('pointerup',up,true);};
  },[gl,camera,scene]);
  return null;
}

function CameraRig({command,assembly,center,width}) {
  const controls=useRef();const {camera,gl,scene,size}=useThree();const [ready,setReady]=useState(false);
  useEffect(()=>{
    const target=assembly?[0,.48,0]:[0,1,0];
    const mobile=size.width<600;
    const fit=mobile?Math.max(1,Math.min(2.3,.88/(size.width/size.height))):1;
    const scale=assembly?Math.max(1,width/1.5)*fit:1;
    const positions=assembly?{perspective:[2.3*scale,1.8*scale,3.1*scale],front:[0,.7,3.5*scale],top:[0,3.8*scale,.01]}:{perspective:[-4.7*fit,1+(3.95-1)*fit,5.6*fit],front:[0,1.35,7.5*fit],top:[0,7.8*fit,.02]};
    if(command.view==='zoom-in'||command.view==='zoom-out')camera.position.sub(controls.current.target).multiplyScalar(command.view==='zoom-in'?.8:1.25).add(controls.current.target);
    else if(command.view==='capture'){
      gl.render(scene,camera);const a=document.createElement('a');a.download='atelier-kitchen.png';a.href=gl.domElement.toDataURL('image/png');a.click();toast.success('Kitchen image downloaded');
    }else{camera.position.set(...(positions[command.view]||positions.perspective));controls.current?.target.set(...target);}
    controls.current?.update();setReady(true);
  },[command,assembly,width,gl,camera,scene,size.width,size.height]);
  useEffect(()=>{window.__studio3d={renderer:gl,scene,camera};return()=>{delete window.__studio3d;};},[gl,scene,camera]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={assembly?.3:2} maxDistance={16} maxPolarAngle={Math.PI/2-.04} target={[0,assembly?.48:1,0]} enabled={ready}/>;
}

function Scene({assembly}) {
  const {scene,config,selected,selectCabinet,explode,inspected,setInspected,camera,update}=useStudio();
  const chosen=assembly?scene.cabinets.filter(c=>selected.includes(c.id)):scene.cabinets;
  const box=useMemo(()=>{
    const min=Math.min(...chosen.map(c=>c.position[0]-c.width/2)),max=Math.max(...chosen.map(c=>c.position[0]+c.width/2));
    const zmin=Math.min(...chosen.map(c=>c.position[2]-c.depth/2)),zmax=Math.max(...chosen.map(c=>c.position[2]+c.depth/2));
    return {x:(min+max)/2000,z:(zmin+zmax)/2000,w:(max-min)/1000,d:(zmax-zmin)/1000};
  },[chosen]);
  const offset=assembly?[-box.x,0,-box.z]:[-scene.dimensions.footprint_width/2000,0,-1.3];
  return <>
    <color attach="background" args={[assembly?'#343a37':config.lighting==='daylight'?'#c7c9c1':'#727a70']}/>
    <ambientLight intensity={config.lighting==='daylight'?1.05:.6}/>
    <directionalLight position={[-3,7,4]} intensity={config.lighting==='daylight'?3:1.5} color={config.lighting==='daylight'?'#fff6e5':'#ffd5a0'} castShadow shadow-mapSize={[2048,2048]} shadow-bias={-.0003} shadow-normalBias={.02} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5}/>
    <directionalLight position={[4,3,-2]} intensity={.8} color="#dae5e1"/>
    <Environment resolution={128}><Lightformer intensity={3} position={[0,4,0]} rotation={[Math.PI/2,0,0]} scale={[8,8,1]}/><Lightformer intensity={2} position={[-4,2,3]} rotation={[0,Math.PI/2,0]} scale={[4,5,1]}/></Environment>
    <group position={offset}>
      {chosen.map(c=><Cabinet3D key={c.id} cabinet={c} config={config} selected={selected.includes(c.id)} amount={assembly?explode:0} assembly={assembly} inspected={inspected} onSelect={selectCabinet} onInspect={setInspected}/>)}
      {!assembly&&<Room3D config={config} cabinets={scene.cabinets} onCeilingToggle={()=>update({ceiling:!config.ceiling})} onRackDismiss={()=>update({rack:'none'})}/>}
    </group>
    {assembly&&<><gridHelper args={[8,40,'#65736b','#454e47']} position={[0,-.17,0]}/><ContactShadows position={[0,-.16,0]} opacity={.32} scale={8} blur={2.8} far={3} frames={1}/></>}
    {!assembly&&config.dimensions&&<group position={offset}><Line points={[[0,.04,3.3],[scene.dimensions.footprint_width/1000,.04,3.3]]} color="#657067" lineWidth={1}/>{[0,scene.dimensions.footprint_width/1000].map(x=><Line key={x} points={[[x,.04,3.23],[x,.04,3.37]]} color="#657067" lineWidth={1}/>)}</group>}
    <CameraRig command={camera} assembly={assembly} width={box.w} center={box}/>
    {!assembly&&<TouchGestures onRackDismiss={()=>update({rack:'none'})}/>}
  </>;
}

export function Viewport({assembly=false}) {
  const {scene,config,update,camera,setCamera,presentation,selected,brand,busy,explode}=useStudio();
  const command=view=>setCamera({view,tick:camera.tick+1});
  const names={oak:'Natural oak',walnut:'American walnut',sage:'Sage green',ivory:'Warm ivory',charcoal:'Soft charcoal'};
  const model=scene?.cabinets.find(c=>c.id===selected[0]);
  return <section className={`viewport ${assembly?'assembly-viewport':''}`} data-testid="kitchen-viewport">
    <div className="viewport-heading"><div className="viewport-eyebrow" data-testid="viewport-mode"><span className="live-dot"/>{assembly?'ASSEMBLY EXPLORER':'LIVE DESIGN'}</div><h1 data-testid="scene-title">{assembly?(selected.length>1?'Merged assembly':model?.name):'A space. Your signature.'}</h1><p data-testid="scene-material-summary">{assembly?`${selected.join(' + ')} · Euro / 32 mm system`:`${names[config.finish]} / ${config.style==='slab'?'Modern slab':config.style==='shaker'?'Classic shaker':'Fluted front'}`}</p></div>
    <div className="viewport-top-tools"><button data-testid="lighting-toggle" title="Switch lighting" onClick={()=>update({lighting:config.lighting==='daylight'?'evening':'daylight'})}>{config.lighting==='daylight'?<Sun size={15}/>:<Moon size={15}/>}<span>{config.lighting==='daylight'?'Daylight':'Evening'}</span></button><span className="render-quality" data-testid="render-quality"><span/> {busy?'Updating':'Live render'}</span>{config.rack!=='none'&&<button data-testid="dismiss-pot-rack" title="Remove pot rack" aria-label="Remove pot rack" onClick={()=>update({rack:'none'})}><span>{config.rack.charAt(0).toUpperCase()+config.rack.slice(1)} pot rack</span><X size={14}/></button>}</div>
    <Canvas frameloop="demand" shadows dpr={[1,1.6]} camera={{position:[-4.7,3.95,5.6],fov:38,near:.01,far:70}} gl={{antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'}} onDoubleClick={()=>!assembly&&update({ceiling:!config.ceiling})} data-testid="kitchen-canvas"><Suspense fallback={null}>{scene&&<Scene assembly={assembly}/>}</Suspense></Canvas>
    <div className="viewport-corner-label" data-testid="viewport-layout"><BoxIcon size={14}/>{assembly?'COMPONENT VIEW':{ 'l-shape':'L-SHAPED / CONCEPT 01',straight:'LINEAR / CONCEPT 02',galley:'GALLEY / CONCEPT 03'}[config.layout]}{!assembly&&config.dimensions&&<span data-testid="scene-width-dimension"> · {formatDimension(scene.dimensions.footprint_width,config.units)}</span>}</div>
    <div className="view-dock" data-testid="camera-toolbar">
      <div className="view-segment">{[['perspective','3D'],['front','Front'],['top','Top']].map(([view,label])=><button key={view} data-testid={`camera-${view}`} className={(camera.view===view||view==='perspective'&&!['front','top'].includes(camera.view))?'active':''} onClick={()=>command(view)}>{label}</button>)}</div>
      <i/><button title="Zoom in" aria-label="Zoom in" data-testid="camera-zoom-in" onClick={()=>command('zoom-in')}><Plus size={17}/></button><button title="Zoom out" aria-label="Zoom out" data-testid="camera-zoom-out" onClick={()=>command('zoom-out')}><Minus size={17}/></button><i/><button title="Reset view" aria-label="Reset view" data-testid="camera-reset" onClick={()=>command('perspective')}><Focus size={17}/></button><button title="Download image" aria-label="Download image" data-testid="camera-capture" onClick={()=>command('capture')}><Camera size={17}/></button>
    </div>
    {assembly?<div className="viewport-bottom-right" data-testid="exploded-stage-label">{Math.round(explode*100)}% EXPLODED</div>:<div className="viewport-bottom-right" data-testid="viewport-brand">DESIGNED IN <strong>{brand.name.toUpperCase()}</strong></div>}
  </section>;
}