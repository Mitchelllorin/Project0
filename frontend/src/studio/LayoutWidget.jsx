import React,{useEffect,useState} from 'react';
import {Move,RotateCw,Plus,Trash2,Check,Link2,Unlink,ChevronDown,SlidersHorizontal} from 'lucide-react';
import {toast} from 'sonner';
import {useStudio} from './StudioContext';
import {MergeDialog} from './MergeDialog';
import {CABINET_KINDS,GIZMO_MODES,SIZE_MAX_MM,SIZE_MIN_MM,WIDTH_OPTIONS,clampSize,groupFor,placementReadout,snapLabel} from './layoutWidget';
import {PanelDismiss,PanelPill,usePanel} from './Panels';
import {formatDimension} from './engine';

// The size a cabinet is built at, typed rather than pulled. Pulling is the fast way and
// lands on the inch a shop quotes in; this is for when you already know the number, in
// whatever unit the studio is showing. Committed on blur or Enter, because every keystroke
// would otherwise be a request to re-cut the carcass.
function ExactSize({cabinet,units,onCommit}){
  const show=mm=>units==='in'?Math.round(mm/25.4*10)/10:Math.round(mm);
  const [draft,setDraft]=useState(()=>String(show(cabinet.width)));
  useEffect(()=>setDraft(String(show(cabinet.width))),[cabinet.id,cabinet.width,units]);
  const commit=()=>{
    const typed=Number(draft);
    const next=clampSize(units==='in'?typed*25.4:typed);
    setDraft(String(show(next)));
    if(Math.round(next)!==Math.round(cabinet.width))onCommit(cabinet.id,next);
  };
  return <label className="arrange-width exact-size"><span>Exact</span><input data-testid="cabinet-size-input" type="number" min={units==='in'?12:Math.round(SIZE_MIN_MM)} max={units==='in'?60:Math.round(SIZE_MAX_MM)} step={units==='in'?0.5:1} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();}} aria-label={`Exact cabinet width in ${units==='in'?'inches':'millimetres'}`}/><em>{units}</em></label>;
}

// Deliberately one row. While you are arranging, the card must not sit over the
// model, so the controls reached for constantly — move, rotate, merge, done —
// are the entire visible widget, and the rest of the layout workflow opens
// behind a single disclosure instead of being permanently in the way.
export function LayoutWidget(){
  const {config,scene,selected,selectCabinet,setArrange,gizmoMode,setGizmoMode,setCabinetWidth,morphCabinet,addCabinet,removeCabinet,resetArrangement,update}=useStudio();
  const [mergeOpen,setMergeOpen]=useState(false);
  const [open,setOpen]=useState(false);
  // `open` above is the More disclosure inside the widget; `panel` is the whole widget
  // being put away. Dismissing it leaves a pill in the same corner, so arranging can be
  // got out of and back into without leaving arrange mode.
  //
  // It starts open, because the only way in is asking to lay the kitchen out — tapping a
  // cabinet in the model, or pressing Layout. An extra click to summon a card you just
  // asked for is a step with nothing in it. The card is capped below the middle of the
  // model (App.css, locked by layoutCardCap.test.js), so open is no longer the same as in
  // the way, and dismissing it still leaves a pill that brings it back.
  const panel=usePanel(true);
  const cabinets=scene?scene.cabinets:[];
  const current=cabinets.find(c=>c.id===selected[0])||null;
  const group=groupFor(config.groups,selected[0]);
  const readout=placementReadout(current,config.units);
  const unmerge=()=>{update({groups:config.groups.filter(g=>g!==group)});toast.success('Cabinets unmerged. All components preserved.');};
  if(!panel.open)return <div className="layout-widget is-collapsed" data-testid="layout-widget-collapsed"><PanelPill label="the layout controls" text="Layout" icon={<Move size={13}/>} testId="layout-expand" onRestore={panel.restore}/></div>;
  return <div className="layout-widget" data-testid="layout-widget" role="group" aria-label="Cabinet layout">
    {open&&<div className="layout-extra" data-testid="layout-extra">
      <div className="arrange-row"><label className="layout-select"><span>Cabinet</span><div className="select-wrap"><select data-testid="layout-cabinet-select" aria-label="Cabinet the gizmo controls" value={selected[0]||''} onChange={e=>selectCabinet(e.target.value)}>{cabinets.map(c=><option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</select><ChevronDown size={13}/></div></label></div>
      {readout&&<div className="layout-readout" data-testid="layout-placement-readout"><div><span>Position X · Z</span><strong data-testid="layout-position">{readout.position}</strong></div><div><span>Rotation</span><strong data-testid="layout-rotation">{readout.rotation}</strong></div></div>}
      {current&&<div className="arrange-row arrange-kind" data-testid="cabinet-kind-row"><span className="arrange-kind-label">What it is</span>{CABINET_KINDS.map(kind=><button key={kind.id} type="button" data-testid={`kind-${kind.id}`} className={current.kind===kind.id?'active':''} aria-pressed={current.kind===kind.id} title={kind.hint} onClick={()=>morphCabinet(current.id,kind.id)}>{kind.label}</button>)}</div>}
      <div className="arrange-row arrange-size">{current?<ExactSize cabinet={current} units={config.units} onCommit={setCabinetWidth}/>:null}{current?<label className="arrange-width"><span>Stock</span><div className="select-wrap"><select data-testid="cabinet-width" aria-label="Cabinet width" value={Math.round(current.width)} onChange={e=>setCabinetWidth(current.id,Number(e.target.value))}>{WIDTH_OPTIONS.map(option=><option key={option.mm} value={option.mm}>{option.label}</option>)}</select><ChevronDown size={13}/></div></label>:<span className="arrange-hint">No cabinet selected</span>}</div>
      <div className="arrange-row arrange-add"><button type="button" data-testid="add-base" onClick={()=>addCabinet('base')}><Plus size={13}/> Base</button><button type="button" data-testid="add-drawers" onClick={()=>addCabinet('drawers')}><Plus size={13}/> Drawers</button><button type="button" data-testid="add-corner" onClick={()=>addCabinet('corner')}><Plus size={13}/> Inside corner</button><button type="button" data-testid="add-corner-out" onClick={()=>addCabinet('corner-out')}><Plus size={13}/> Outside corner</button></div>
      <div className="arrange-row arrange-actions"><button type="button" data-testid="remove-cabinet" disabled={!selected.length} onClick={()=>removeCabinet(selected[0])}><Trash2 size={13}/> Remove {selected[0]||''}</button><button type="button" data-testid="reset-arrangement" onClick={resetArrangement}>Reset to layout</button></div>
      <span className="arrange-hint" data-testid="layout-group-readout">{group?`Merged run ${group.join(' + ')}`:`Gizmo snaps to ${snapLabel(config.units)}`}</span>
    </div>}
    <div className="arrange-row layout-bar" data-testid="layout-bar">
      {current&&<span className="layout-size" data-testid="layout-size-readout" title={`${current.id} · pull either end to stretch it`}>{formatDimension(current.width,config.units)} · {CABINET_KINDS.find(k=>k.id===current.kind)?.label||current.kind}</span>}
      <div className="arrange-segment">{GIZMO_MODES.map(mode=><button key={mode.id} type="button" data-testid={`gizmo-${mode.id}`} className={gizmoMode===mode.id?'active':''} aria-pressed={gizmoMode===mode.id} title={mode.hint} onClick={()=>setGizmoMode(mode.id)}>{mode.id==='rotate'?<RotateCw size={13}/>:<Move size={13}/>} {mode.label}</button>)}</div>
      {group?<button type="button" data-testid="layout-unmerge" title={`Unmerge ${group.join(' + ')}`} onClick={unmerge}><Unlink size={13}/> Unmerge</button>:<button type="button" data-testid="layout-merge" title="Merge neighbouring cabinets into one run" onClick={()=>setMergeOpen(true)}><Link2 size={13}/> Merge</button>}
      <button type="button" className={open?'active':''} data-testid="layout-more" aria-expanded={open} title="More layout controls" onClick={()=>setOpen(!open)}><SlidersHorizontal size={13}/> {open?'Less':'More'}</button>
      <button type="button" className="accent" data-testid="done-arranging" onClick={()=>setArrange(false)}><Check size={13}/> Done</button>
      <PanelDismiss label="the layout controls" testId="layout-dismiss" className="layout-dismiss" onDismiss={panel.dismiss}/>
    </div>
    {mergeOpen&&<MergeDialog open={mergeOpen} onOpenChange={setMergeOpen}/>}
  </div>;
}
