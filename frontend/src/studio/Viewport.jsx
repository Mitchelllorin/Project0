import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useThree,useFrame} from '@react-three/fiber';
import {OrbitControls,Environment,Lightformer,ContactShadows,Line,TransformControls,useCursor} from '@react-three/drei';
import {Box as BoxIcon,Camera,Sun,Moon,Plus,Minus,Focus,Layers,X,DoorOpen,Move,Info,SlidersHorizontal} from 'lucide-react';
import {PanelDismiss,PanelPill,usePanel} from './Panels';
import {useStudio} from './StudioContext';
import {LayoutWidget} from './LayoutWidget';
import {TRANSLATION_SNAP_M,ROTATION_SNAP_RAD,stretchedWidth,stretchable} from './layoutWidget';
import {doorsOpenFor} from './doors';
import {useNavigate} from 'react-router-dom';
import {Cabinet3D} from './Cabinet3D';
import {Room3D} from './Room3D';
import {formatDimension,explodedPosition} from './engine';
import {useDeviceProfile,renderBudget,profileFrom} from './device';
import {tapGuard,installTapGuard} from './pointer';
import {ORBIT_DAMPING,freezeShadows,resumeShadows} from './interaction';
import {Button} from '../components/ui/button';
import {toast} from 'sonner';
import * as THREE from 'three';

const HIGH_BUDGET=renderBudget(profileFrom({width:1440,height:900}));

// The grip sits on the front face just under the counter line, not on the end panel.
// An end panel is exactly where the next cabinet in the run is standing, so a pull that
// lived there could not be reached on any cabinet that had a neighbour — which is every
// cabinet in a fitted kitchen.
const GRIP_Y=.945;
const GRIP_Z=.05;

// Pulling the end of a cabinet is the one layout move that is quicker to do than to
// describe. The grip is a bar on the end face of the selected cabinet; dragging it moves
// that end and only that end, so a run that grows never shoves the cabinet standing next
// to it — see `stretchedWidth` for the arithmetic and its tests for the proof.
function SizeGrip({cabinet,side,onResize}){
  const {gl,camera}=useThree();
  const controls=useThree(state=>state.controls);
  const frame=useRef(null),pull=useRef(null);
  const [active,setActive]=useState(false),[hovered,setHovered]=useState(false);
  useCursor(hovered);
  const rad=cabinet.rotation||0;
  useEffect(()=>{
    if(!active)return;
    const element=gl.domElement,ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),hit=new THREE.Vector3();
    const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(cabinet.height/1000)*GRIP_Y);
    const move=event=>{
      if(!frame.current)return;
      const rect=element.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);
      if(!ray.ray.intersectPlane(plane,hit))return;
      // The frame has moved since the last paint, so bring its matrix up to date before
      // asking it where the pointer is; otherwise the pull reads the previous frame's pose.
      frame.current.updateWorldMatrix(true,false);
      const local=frame.current.worldToLocal(hit.clone());
      const {width,shift}=stretchedWidth({width:pull.current.width,localX:local.x*1000,side});
      const x=pull.current.x+shift*Math.cos(rad),z=pull.current.z-shift*Math.sin(rad);
      pull.current={...pull.current,width,x,z};
      onResize(cabinet.id,width,x,z,true);
    };
    const end=()=>{
      setActive(false);
      if(controls)controls.enabled=true;
      // The release is the one move worth an undo step.
      if(pull.current)onResize(cabinet.id,pull.current.width,pull.current.x,pull.current.z,false);
    };
    element.addEventListener('pointermove',move);
    element.addEventListener('pointerup',end);
    element.addEventListener('pointercancel',end);
    return()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',end);element.removeEventListener('pointercancel',end);};
  },[active,gl,camera,rad,side,cabinet.id,cabinet.height,onResize,controls]);
  const grab=event=>{
    event.stopPropagation();
    pull.current={width:cabinet.width,x:cabinet.position[0],z:cabinet.position[2]};
    // This is what makes the pull a pull: three re-checks `enabled` on every move, so it
    // does not matter that OrbitControls saw the pointerdown before this handler ran.
    if(controls)controls.enabled=false;
    try{gl.domElement.setPointerCapture(event.pointerId);}catch{/* not capturable */}
    setActive(true);
  };
  const w=cabinet.width/1000;
  return <group ref={frame}>
    <mesh name={`size-grip-${side>0?'right':'left'}`} position={[side*(w/2-.03),(cabinet.height/1000)*GRIP_Y,cabinet.depth/2000+GRIP_Z]}
      onPointerDown={grab} onPointerOver={e=>{e.stopPropagation();setHovered(true);}} onPointerOut={()=>setHovered(false)}>
      <boxGeometry args={[.03,.11,.03]}/>
      <meshStandardMaterial color={active?'#ffd08a':hovered?'#f0cd93':'#dcb478'} emissive="#e2b878" emissiveIntensity={active?.5:0} metalness={.25} roughness={.35}/>
    </mesh>
  </group>;
}

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
  const controls=useRef();const {camera,gl,scene,size,invalidate}=useThree();const [ready,setReady]=useState(false);
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
  // A drag that ends by navigating away never fires 'end'; put the shadow map back.
  useEffect(()=>()=>resumeShadows(gl),[gl]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={ORBIT_DAMPING} minDistance={assembly?.3:2} maxDistance={16} maxPolarAngle={Math.PI/2-.04} target={[0,assembly?.48:1,0]} enabled={ready} onStart={()=>freezeShadows(gl)} onEnd={()=>resumeShadows(gl,invalidate)}/>;
}

function AssemblyVectors({cabinets,amount}) {
  // One draw call for every part's assembly vector, so the explode can be read as motion.
  const geometry=useMemo(()=>{
    const points=[];
    cabinets.forEach(c=>{
      const ca=Math.cos(c.rotation),sa=Math.sin(c.rotation);
      const world=([x,y,z])=>[c.position[0]/1000+x*ca+z*sa,y,c.position[2]/1000-x*sa+z*ca];
      c.parts.forEach(p=>{
        const a=world(p.position.map(n=>n/1000));
        const b=world(explodedPosition(p,c.parts,amount));
        points.push(a[0],a[1],a[2],b[0],b[1],b[2]);
      });
    });
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    return g;
  },[cabinets,amount]);
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#e2b878" transparent opacity={.4}/></lineSegments>;
}

function Scene({assembly,onOpenAssembly,budget=HIGH_BUDGET}) {
  const {scene,config,selected,selectCabinet,explode,inspected,setInspected,camera,update,doorsOpen,arrange,setArrange,gizmoMode,moveCabinet,resizeCabinet,picked}=useStudio();
  const gizmo=useRef();
  const chosen=assembly?scene.cabinets.filter(c=>selected.includes(c.id)):scene.cabinets;
  const box=useMemo(()=>{
    if(!chosen.length)return {x:0,z:0,w:0,d:0};
    const min=Math.min(...chosen.map(c=>c.position[0]-c.width/2)),max=Math.max(...chosen.map(c=>c.position[0]+c.width/2));
    const zmin=Math.min(...chosen.map(c=>c.position[2]-c.depth/2)),zmax=Math.max(...chosen.map(c=>c.position[2]+c.depth/2));
    return {x:(min+max)/2000,z:(zmin+zmax)/2000,w:(max-min)/1000,d:(zmax-zmin)/1000};
  },[chosen]);
  const offset=assembly?[-box.x,0,-box.z]:[-scene.dimensions.footprint_width/2000,0,-1.3];
  return <>
    <color attach="background" args={[assembly?'#343a37':config.lighting==='daylight'?'#c7c9c1':'#727a70']}/>
    <ambientLight intensity={config.lighting==='daylight'?1.05:.6}/>
    <directionalLight position={[-3,7,4]} intensity={config.lighting==='daylight'?3:1.5} color={config.lighting==='daylight'?'#fff6e5':'#ffd5a0'} castShadow shadow-mapSize={[budget.shadowMapSize,budget.shadowMapSize]} shadow-bias={-.0003} shadow-normalBias={.02} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5}/>
    <directionalLight position={[4,3,-2]} intensity={.8} color="#dae5e1"/>
    <Environment resolution={budget.environmentResolution}><Lightformer intensity={3} position={[0,4,0]} rotation={[Math.PI/2,0,0]} scale={[8,8,1]}/><Lightformer intensity={2} position={[-4,2,3]} rotation={[0,Math.PI/2,0]} scale={[4,5,1]}/></Environment>
    <group position={offset}>
      {chosen.map(c=>{
        // Touching a cabinet in the model is how you ask to move it. Selecting from a
        // panel list is a different intent, so that path leaves the layout card alone.
        const props={cabinet:c,config,selected:selected.includes(c.id),amount:assembly?explode:0,assembly,inspected,onSelect:id=>{selectCabinet(id);if(!assembly)setArrange(true);},onInspect:setInspected,open:doorsOpenFor(c.id,{doorsOpen,selected,assembly,picked}),onOpenAssembly:()=>onOpenAssembly&&onOpenAssembly(c.id)};
        if(!arrange||!selected.includes(c.id)||c.id!==selected[0])return <Cabinet3D key={c.id} {...props}/>;
        return <React.Fragment key={c.id}>
          <TransformControls mode={gizmoMode} translationSnap={TRANSLATION_SNAP_M} rotationSnap={ROTATION_SNAP_RAD} size={.75} onMouseUp={()=>{const o=gizmo.current;if(o)moveCabinet(c.id,o.position.x*1000,o.position.z*1000,o.rotation.y);}}>
            <group ref={gizmo} position={c.position.map(n=>n/1000)} rotation={[0,c.rotation,0]}><Cabinet3D {...props} cabinet={{...c,position:[0,0,0],rotation:0}}/></group>
          </TransformControls>
          {stretchable(c.kind)&&<group position={c.position.map(n=>n/1000)} rotation={[0,c.rotation,0]}>{[1,-1].map(side=><SizeGrip key={side} cabinet={c} side={side} onResize={resizeCabinet}/>)}</group>}
        </React.Fragment>;
      })}
      {!assembly&&<Room3D config={config} cabinets={scene.cabinets} onCeilingToggle={()=>update({ceiling:!config.ceiling})} onRackDismiss={()=>update({rack:'none'})}/>}
      {assembly&&explode>.02&&<AssemblyVectors cabinets={chosen} amount={explode}/>}
      {!assembly&&!arrange&&selected.length>1&&(()=>{const sel=scene.cabinets.filter(c=>selected.includes(c.id));if(sel.length<2)return null;const xs=sel.flatMap(c=>[-c.width/2,c.width/2].map(h=>c.position[0]+h*Math.abs(Math.cos(c.rotation))));const min=Math.min(...xs)/1000,max=Math.max(...xs)/1000,z=Math.max(...sel.map(c=>c.position[2]))/1000+.7;return <Line points={[[min,.05,z],[max,.05,z]]} color="#c8a15c" lineWidth={1.5}/>;})()}
    </group>
    {assembly&&<><gridHelper args={[8,40,'#65736b','#454e47']} position={[0,-.17,0]}/><ContactShadows position={[0,-.16,0]} opacity={.32} scale={8} blur={budget.contactShadowBlur} far={3} frames={1}/></>}
    {!assembly&&config.dimensions&&<group position={offset}><Line points={[[0,.04,3.3],[scene.dimensions.footprint_width/1000,.04,3.3]]} color="#657067" lineWidth={1}/>{[0,scene.dimensions.footprint_width/1000].map(x=><Line key={x} points={[[x,.04,3.23],[x,.04,3.37]]} color="#657067" lineWidth={1}/>)}</group>}
    <CameraRig command={camera} assembly={assembly} width={box.w} center={box}/>
    {!assembly&&<TouchGestures onRackDismiss={()=>update({rack:'none'})}/>}
  </>;
}

export function Viewport({assembly=false}) {
  const {scene,config,update,camera,setCamera,presentation,selected,brand,busy,explode,selectCabinet,setInspected,doorsOpen,toggleDoors,arrange,setArrange}=useStudio();const navigate=useNavigate();
  const device=useDeviceProfile();const budget=renderBudget(device);
  // Every panel that floats over the model can be put away, and every one leaves a pill
  // behind. Session-only: the next visit gets its controls back.
  const heading=usePanel(),tools=usePanel(),dock=usePanel();
  useEffect(()=>installTapGuard(),[]);
  const command=view=>setCamera({view,tick:camera.tick+1});
  const names={oak:'Natural oak',walnut:'American walnut',sage:'Sage green',ivory:'Warm ivory',charcoal:'Soft charcoal'};
  const model=scene?.cabinets.find(c=>c.id===selected[0]);
  return <section className={`viewport ${assembly?'assembly-viewport':''}`} data-testid="kitchen-viewport">
    {heading.open?
      <div className="viewport-heading" data-testid="viewport-heading"><div className="viewport-eyebrow" data-testid="viewport-mode"><span className="live-dot"/>{assembly?'ASSEMBLY EXPLORER':'LIVE DESIGN'}<PanelDismiss label="the design caption" testId="heading-dismiss" className="heading-dismiss" onDismiss={heading.dismiss}/></div><h1 data-testid="scene-title">{assembly?(selected.length>1?'Merged assembly':model?.name):'A space. Your signature.'}</h1><p data-testid="scene-material-summary">{assembly?`${selected.join(' + ')} · Euro / 32 mm system`:`${names[config.finish]} / ${config.style==='slab'?'Modern slab':config.style==='shaker'?'Classic shaker':'Fluted front'}`}</p>{assembly?<p className="viewport-hint">{device.touch?"Tap a component to inspect it":"Click a component to inspect it"}</p>:<p className="viewport-hint">{device.touch?"Tap a cabinet to select · then tap Assembly":"Click a cabinet to select · double-click to explore its assembly"}</p>}</div>
      :<div className="viewport-heading" data-testid="viewport-heading-collapsed"><PanelPill label="the design caption" text="Caption" icon={<Info size={13}/>} testId="heading-expand" onRestore={heading.restore}/></div>}
    {tools.open?
      <div className="viewport-top-tools" data-testid="viewport-tools"><PanelDismiss label="the view tools" testId="tools-dismiss" className="tools-dismiss" onDismiss={tools.dismiss}/><button data-testid="lighting-toggle" title="Switch lighting" onClick={()=>update({lighting:config.lighting==='daylight'?'evening':'daylight'})}>{config.lighting==='daylight'?<Sun size={15}/>:<Moon size={15}/>}<span>{config.lighting==='daylight'?'Daylight':'Evening'}</span></button>{!assembly&&<button data-testid="doors-toggle" title={doorsOpen?"Close the cabinet doors":"Open the cabinet doors"} aria-label={doorsOpen?"Close the cabinet doors":"Open the cabinet doors"} onClick={toggleDoors}><DoorOpen size={15}/><span>{doorsOpen?"Close doors":"Open doors"}</span></button>}{!assembly&&<button data-testid="arrange-toggle" className={arrange?"active":""} title="Arrange cabinets freely" aria-label="Arrange cabinets" onClick={()=>setArrange(!arrange)}><Move size={15}/><span>{arrange?"Arranging":"Arrange"}</span></button>}{!assembly&&<button data-testid="open-assembly" disabled={!selected.length} title={selected.length?"Explore this cabinet's assembly":"Select a cabinet first"} aria-label="Explore assembly" onClick={()=>selected.length&&navigate('/assembly')}><Layers size={15}/><span>Assembly</span></button>}<span className="render-quality" data-testid="render-quality"><span/> {busy?'Updating':'Live render'}</span>{config.rack!=='none'&&<button data-testid="dismiss-pot-rack" title="Remove pot rack" aria-label="Remove pot rack" onClick={()=>update({rack:'none'})}><span>{config.rack.charAt(0).toUpperCase()+config.rack.slice(1)} pot rack</span><X size={14}/></button>}</div>
      :<div className="viewport-top-tools" data-testid="viewport-tools-collapsed"><PanelPill label="the view tools" text="View tools" icon={<SlidersHorizontal size={13}/>} testId="tools-expand" onRestore={tools.restore}/></div>}
    <Canvas frameloop="demand" shadows dpr={budget.dpr} camera={{position:[-4.7,3.95,5.6],fov:38,near:.01,far:70}} gl={{antialias:true,powerPreference:'high-performance'}} onPointerMissed={()=>{if(tapGuard.isTap())setInspected(null);}} data-testid="kitchen-canvas"><Suspense fallback={null}>{scene&&<Scene budget={budget} assembly={assembly} onOpenAssembly={id=>{selectCabinet(id);navigate('/assembly');}}/>}</Suspense></Canvas>
    {!assembly&&arrange&&<LayoutWidget/>}
    <div className="viewport-corner-label" data-testid="viewport-layout"><BoxIcon size={14}/>{assembly?'COMPONENT VIEW':{ 'l-shape':'L-SHAPED / CONCEPT 01',straight:'LINEAR / CONCEPT 02',galley:'GALLEY / CONCEPT 03'}[config.layout]}{!assembly&&config.dimensions&&<span data-testid="scene-width-dimension"> · {formatDimension(scene.dimensions.footprint_width,config.units)}</span>}</div>
    {dock.open?
      <div className="view-dock" data-testid="camera-toolbar">
      <div className="view-segment">{[['perspective','3D'],['front','Front'],['top','Top']].map(([view,label])=><button key={view} data-testid={`camera-${view}`} className={(camera.view===view||view==='perspective'&&!['front','top'].includes(camera.view))?'active':''} onClick={()=>command(view)}>{label}</button>)}</div>
      <i/><button title="Zoom in" aria-label="Zoom in" data-testid="camera-zoom-in" onClick={()=>command('zoom-in')}><Plus size={17}/></button><button title="Zoom out" aria-label="Zoom out" data-testid="camera-zoom-out" onClick={()=>command('zoom-out')}><Minus size={17}/></button><i/><button title="Reset view" aria-label="Reset view" data-testid="camera-reset" onClick={()=>command('perspective')}><Focus size={17}/></button><button title="Download image" aria-label="Download image" data-testid="camera-capture" onClick={()=>command('capture')}><Camera size={17}/></button>
      <PanelDismiss label="the camera dock" testId="dock-dismiss" className="dock-dismiss" onDismiss={dock.dismiss}/>
    </div>
      :<div className="view-dock is-collapsed" data-testid="camera-toolbar-collapsed"><PanelPill label="the camera dock" text="Camera" icon={<Camera size={15}/>} testId="dock-expand" onRestore={dock.restore}/></div>}
    {assembly?<div className="viewport-bottom-right" data-testid="exploded-stage-label">{Math.round(explode*100)}% EXPLODED</div>:<div className="viewport-bottom-right" data-testid="viewport-brand">DESIGNED IN <strong>{brand.name.toUpperCase()}</strong></div>}
  </section>;
}