import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {Box,Layers,MoveUpRight,Link2,Unlink,ChevronRight,ArrowUpRight,Search,Check,Component,Settings2,ArrowRight} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {toast} from 'sonner';
import axios from 'axios';
import {useStudio,API} from './StudioContext';
import {formatDimension,money} from './engine';
import {PartGeometry} from './PartGeometry';
import {SectionHeading,Select} from './Controls';

export function MergeDialog({open,onOpenChange}) {
  const {config,update,scene,selected,setSelected}=useStudio();
  const [ids,setIds]=useState(selected),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const merge=async()=>{setLoading(true);setError('');try{await axios.post(`${API}/groups/preview`,{configuration:config,cabinet_ids:ids});update({groups:[...config.groups.filter(g=>!g.some(id=>ids.includes(id))),ids]});setSelected(ids);onOpenChange(false);toast.success(`${ids.length} cabinets merged into one logical unit`);}catch(e){setError(e.response?.data?.detail||'Could not merge these cabinets.');}finally{setLoading(false);}};
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="studio-dialog" data-testid="merge-dialog"><DialogTitle data-testid="merge-dialog-title">Better together.</DialogTitle><DialogDescription data-testid="merge-dialog-description">Choose neighboring cabinets for one logical unit. Every child part stays intact.</DialogDescription><div className="merge-choices">{scene.cabinets.map(c=><label key={c.id} className={ids.includes(c.id)?'checked':''}><input type="checkbox" data-testid={`merge-select-${c.id}`} checked={ids.includes(c.id)} onChange={e=>setIds(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/><Box size={20}/><span><strong>{c.id} · {c.name}</strong><small>{formatDimension(c.width,config.units)}</small></span></label>)}</div>{error&&<p className="error-message" data-testid="merge-error">{error}</p>}<Button className="accent-button" data-testid="confirm-merge-button" disabled={ids.length<2||loading} onClick={merge}><Link2 size={15}/>{loading?'Merging…':`Merge ${ids.length} cabinets`}</Button></DialogContent></Dialog>;
}

export function AssemblyTree() {
  const {scene,selected,selectCabinet,inspected,setInspected,config,group}=useStudio();
  const [category,setCategory]=useState('panel'),[search,setSearch]=useState('');
  const cabinets=scene.cabinets.filter(c=>selected.includes(c.id));
  const all=cabinets.flatMap(c=>c.parts.map(p=>({...p,cabinetId:c.id})));
  const parts=all.filter(p=>p.category===category&&p.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="assembly-tree" data-testid="assembly-tree"><div className="panel-title"><div><span className="overline">INSIDE THE DESIGN</span><h2 data-testid="assembly-tree-title">Assembly structure</h2></div><Layers size={18}/></div>
    <div className="assembly-select"><Select id="assembly-cabinet-select" value={selected[0]} onChange={selectCabinet}>{scene.cabinets.map(c=><option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</Select>{group&&<span className="group-chip" data-testid="assembly-group-chip"><Link2 size={12}/>{group.join(' + ')}</span>}</div>
    <div className="part-search"><Search size={14}/><input data-testid="part-search" placeholder="Find a component…" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Find a component"/></div>
    <div className="part-categories">{[['panel','Panels'],['hardware','Hardware'],['fastener','Fasteners']].map(([cat,label])=><button key={cat} data-testid={`part-category-${cat}`} onClick={()=>setCategory(cat)} className={category===cat?'active':''}>{label}<span>{all.filter(p=>p.category===cat).length}</span></button>)}</div>
    <div className="part-list" data-testid="assembly-parts-list">{parts.map(p=><button key={`${p.cabinetId}-${p.id}`} className={inspected?.partId===p.id&&inspected?.cabinetId===p.cabinetId?'active':''} data-testid={`inspect-part-${p.cabinetId}-${p.id}`} onClick={()=>setInspected({cabinetId:p.cabinetId,partId:p.id})}><span className={`part-icon ${p.category}`}><Component size={16}/></span><span><strong>{p.name}</strong><small>{p.cabinetId} / {p.id}</small></span><ChevronRight size={13}/></button>)}{!parts.length&&<p className="empty-state" data-testid="parts-empty-state">No matching components.</p>}</div>
    <div className="panel-footnote" data-testid="assembly-part-count">{all.length} individual components · {cabinets.length} {cabinets.length===1?'cabinet':'cabinets'}</div>
  </div>;
}

function PartInspector({part,cabinetId}) {
  const {config}=useStudio();const s=Math.max(...part.size)/1000;
  return <><div className="part-3d-preview" data-testid="component-preview"><Canvas camera={{position:[s*1.6,s*.9,s*2.2],near:.0001,far:50,fov:42}} dpr={[1,1.5]}><ambientLight intensity={1.8}/><directionalLight position={[1,3,4]} intensity={3}/><PartGeometry part={part} config={config} detail/><OrbitControls enablePan={false} minDistance={s*.4} maxDistance={s*5}/></Canvas><span data-testid="part-category-label">{part.category}</span></div><h3 className="part-title" data-testid="inspected-part-name">{part.name}</h3><div className="part-identifier" data-testid="inspected-part-id">{cabinetId} / {part.id}</div><dl className="spec-list"><div><dt>Dimensions</dt><dd data-testid="part-dimensions">{part.size.map(n=>formatDimension(n,config.units)).join(' × ')}</dd></div><div><dt>Removal axis</dt><dd data-testid="part-removal-axis">[{part.assembly_axis.join(', ')}]</dd></div><div><dt>Assembly stage</dt><dd data-testid="part-stage">0{part.assembly_order} / {part.category}</dd></div><div><dt>Parent</dt><dd data-testid="part-parent">{part.parent_id||'Carcass root'}</dd></div><div><dt>Material</dt><dd data-testid="part-material">{part.material}</dd></div></dl>{Object.keys(part.machining).length>0&&<div className="machining-info"><h4>Machining details</h4>{Object.entries(part.machining).filter(([key,value])=>!Array.isArray(value)&&key!=='side').map(([key,value])=><div key={key} data-testid={`machining-${key}`}><span>{key.replaceAll('_',' ')}</span><strong>{String(value)}</strong></div>)}</div>}</>;
}

export function Inspector({assembly=false}) {
  const {scene,config,selected,selectCabinet,group,update,inspected,setInspected,setExplode}=useStudio();
  const navigate=useNavigate();const [mergeOpen,setMergeOpen]=useState(false);
  const cabinets=scene.cabinets.filter(c=>selected.includes(c.id));const cabinet=cabinets[0];
  const parts=cabinets.flatMap(c=>c.parts);const part=inspected&&scene.cabinets.find(c=>c.id===inspected.cabinetId)?.parts.find(p=>p.id===inspected.partId);
  const run=cabinets.reduce((n,c)=>n+c.width,0);
  const corners=cabinets.flatMap(c=>{const angle=c.rotation;return [-1,1].flatMap(x=>[-1,1].map(z=>[c.position[0]+x*c.width/2*Math.cos(angle)+z*c.depth/2*Math.sin(angle),c.position[2]-x*c.width/2*Math.sin(angle)+z*c.depth/2*Math.cos(angle)]));});
  const fw=Math.max(...corners.map(p=>p[0]))-Math.min(...corners.map(p=>p[0])),fd=Math.max(...corners.map(p=>p[1]))-Math.min(...corners.map(p=>p[1]));
  const unmerge=()=>{update({groups:config.groups.filter(g=>g!==group)});toast.success('Cabinets unmerged. All components preserved.');};
  return <aside className="inspector" data-testid="inspector-panel"><div className="panel-title"><div><span className="overline">{part&&assembly?'COMPONENT DETAIL':'IN FOCUS'}</span><h2 data-testid="inspector-heading">{part&&assembly?'Part inspection':'Selected cabinet'}</h2></div><Box size={18}/></div>
    <div className="inspector-body">{part&&assembly?<><button className="text-button" data-testid="back-to-cabinet" onClick={()=>setInspected(null)}>← Back to assembly</button><PartInspector part={part} cabinetId={inspected.cabinetId}/></>:<>
      <Select id="selected-cabinet-select" value={selected[0]} onChange={selectCabinet}>{scene.cabinets.map(c=><option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</Select>
      <div className="cabinet-id-block"><span className="cabinet-glyph"><Box size={35} strokeWidth={1}/></span><div><span className="overline" data-testid="selected-cabinet-ids">{selected.join(' + ')}</span><h3 data-testid="selected-cabinet-name">{group?'Merged cabinet unit':cabinet?.name}</h3><span className="collection-label">Frameless collection</span></div></div>
      <div className="primary-dimension"><span>LOGICAL RUN LENGTH</span><strong data-testid="logical-run-length-display">{formatDimension(run,config.units)}</strong></div><div className="footprint-row"><span>Wall footprint</span><strong data-testid="wall-footprint-display">{formatDimension(fw,config.units)} × {formatDimension(fd,config.units)}</strong></div>
      <div className="dimension-grid"><div><span>HEIGHT</span><strong data-testid="cabinet-height">{formatDimension(cabinet?.height||876.3,config.units)}</strong></div><div><span>DEPTH</span><strong data-testid="cabinet-depth">{formatDimension(cabinet?.depth||609.6,config.units)}</strong></div></div>
      <div className="inspector-divider"/><SectionHeading>What's inside</SectionHeading><div className="component-counts">{[['panel','Panels'],['hardware','Hardware'],['fastener','Fasteners']].map(([cat,label])=><div key={cat}><span className={`count-dot ${cat}`}/><span>{label}</span><strong data-testid={`selected-${cat}-count`}>{parts.filter(p=>p.category===cat).length}</strong></div>)}</div>
      {!assembly&&<Button className="accent-button inspect-button" data-testid="explore-assembly-button" onClick={()=>{setExplode(0);navigate('/assembly');}}><Layers size={15}/>Explore assembly<ArrowUpRight size={15}/></Button>}
      <Button variant="outline" className="full-button" data-testid={group?'unmerge-cabinets-button':'merge-cabinets-button'} onClick={()=>group?unmerge():setMergeOpen(true)}>{group?<Unlink size={15}/>:<Link2 size={15}/>} {group?'Unmerge cabinets':'Merge cabinets'}</Button>
      <div className="standards-note" data-testid="cabinet-standard"><span><Check size={12}/> EURO / 32 MM SYSTEM</span><p>¾″ plywood carcass · ¼″ back<br/>4″ recessed toe kick</p>{cabinet?.kind==='corner'&&<p>45° diagonal face · true corner carcass</p>}</div>
    </>}</div>
    {!assembly&&<div className="quote-peek"><span className="overline">ILLUSTRATIVE PROJECT ESTIMATE</span><div><strong data-testid="studio-quote-total">{config.quote.show_prices?money(scene.quote.total):`${scene.cabinets.length} cabinets`}</strong><span>USD</span></div><button data-testid="view-bom-button" onClick={()=>navigate('/quote')}>View quote & bill of materials<ArrowRight size={14}/></button></div>}
    {mergeOpen&&<MergeDialog open={mergeOpen} onOpenChange={setMergeOpen}/>}
  </aside>;
}

export function ExplodeControls() {
  const {explode,setExplode}=useStudio();
  return <div className="explode-controls" data-testid="explode-controls"><div className="explode-title"><span><Layers size={15}/> Exploded assembly</span><strong data-testid="explode-percentage">{Math.round(explode*100)}%</strong></div><input data-testid="explode-slider" aria-label="Explode assembly" type="range" min="0" max="100" value={Math.round(explode*100)} onChange={e=>setExplode(Number(e.target.value)/100)} style={{'--range-progress':`${explode*100}%`}}/><div className="explode-stages">{[['Assembled',0],['Panels',.34],['Hardware',.65],['Fasteners',1]].map(([label,v])=><button key={label} data-testid={`explode-stage-${label.toLowerCase()}`} className={Math.abs(explode-v)<.02?'active':''} onClick={()=>setExplode(v)}><span/>{label}</button>)}</div></div>;
}