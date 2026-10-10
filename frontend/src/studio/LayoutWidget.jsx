import React,{useState} from 'react';
import {Move,RotateCw,Plus,Trash2,Check,X,Link2,Unlink,ChevronDown} from 'lucide-react';
import {toast} from 'sonner';
import {useStudio} from './StudioContext';
import {MergeDialog} from './MergeDialog';
import {GIZMO_MODES,WIDTH_OPTIONS,groupFor,placementReadout,snapLabel} from './layoutWidget';

// The whole free-layout workflow lives in this one card: choose the cabinet the
// gizmo drives, slide it with the coloured arrows or turn it with the coloured
// rings, size it, merge it into a run with its neighbours, add or remove
// carcasses, or fall back to the parametric layout. It replaces the old
// bottom-left bar, so nothing about the layout needs a trip to a side panel.
export function LayoutWidget(){
  const {config,scene,selected,selectCabinet,setArrange,gizmoMode,setGizmoMode,setCabinetWidth,addCabinet,removeCabinet,resetArrangement,update}=useStudio();
  const [mergeOpen,setMergeOpen]=useState(false);
  const cabinets=scene?scene.cabinets:[];
  const current=cabinets.find(c=>c.id===selected[0])||null;
  const group=groupFor(config.groups,selected[0]);
  const readout=placementReadout(current,config.units);
  const unmerge=()=>{update({groups:config.groups.filter(g=>g!==group)});toast.success('Cabinets unmerged. All components preserved.');};
  return <div className="layout-widget" data-testid="layout-widget" role="group" aria-label="Cabinet layout">
    <div className="arrange-title"><span><Move size={15}/> Layout widget</span><span className="layout-title-actions"><strong data-testid="arrange-mode-readout">{config.custom?'Custom layout':'Auto layout'}</strong><button type="button" className="layout-dismiss" data-testid="layout-dismiss" title="Close the layout widget" aria-label="Close the layout widget" onClick={()=>setArrange(false)}><X size={15}/></button></span></div>
    <div className="arrange-row"><div className="arrange-segment">{GIZMO_MODES.map(mode=><button key={mode.id} type="button" data-testid={`gizmo-${mode.id}`} className={gizmoMode===mode.id?'active':''} aria-pressed={gizmoMode===mode.id} title={mode.hint} onClick={()=>setGizmoMode(mode.id)}>{mode.id==='rotate'?<RotateCw size={13}/>:<Move size={13}/>} {mode.label}</button>)}</div><span className="arrange-hint">Snaps to {snapLabel(config.units)}</span></div>
    <div className="arrange-row"><label className="layout-select"><span>Cabinet</span><div className="select-wrap"><select data-testid="layout-cabinet-select" aria-label="Cabinet the gizmo controls" value={selected[0]||''} onChange={e=>selectCabinet(e.target.value)}>{cabinets.map(c=><option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</select><ChevronDown size={13}/></div></label></div>
    {readout&&<div className="layout-readout" data-testid="layout-placement-readout"><div><span>Position X · Z</span><strong data-testid="layout-position">{readout.position}</strong></div><div><span>Rotation</span><strong data-testid="layout-rotation">{readout.rotation}</strong></div></div>}
    <div className="arrange-row arrange-size">{current?<label className="arrange-width"><span>Width</span><div className="select-wrap"><select data-testid="cabinet-width" aria-label="Cabinet width" value={Math.round(current.width)} onChange={e=>setCabinetWidth(current.id,Number(e.target.value))}>{WIDTH_OPTIONS.map(option=><option key={option.mm} value={option.mm}>{option.label}</option>)}</select><ChevronDown size={13}/></div></label>:<span className="arrange-hint">No cabinet selected</span>}</div>
    <div className="arrange-row">{group?<button type="button" data-testid="layout-unmerge" onClick={unmerge}><Unlink size={13}/> Unmerge run</button>:<button type="button" data-testid="layout-merge" onClick={()=>setMergeOpen(true)}><Link2 size={13}/> Merge cabinets</button>}<span className="arrange-hint" data-testid="layout-group-readout">{group?group.join(' + '):'Neighbours become one unit'}</span></div>
    <div className="arrange-row arrange-add"><button type="button" data-testid="add-base" onClick={()=>addCabinet('base')}><Plus size={13}/> Base</button><button type="button" data-testid="add-drawers" onClick={()=>addCabinet('drawers')}><Plus size={13}/> Drawers</button><button type="button" data-testid="add-corner" onClick={()=>addCabinet('corner')}><Plus size={13}/> Inside corner</button><button type="button" data-testid="add-corner-out" onClick={()=>addCabinet('corner-out')}><Plus size={13}/> Outside corner</button></div>
    <div className="arrange-row arrange-actions"><button type="button" data-testid="remove-cabinet" disabled={!selected.length} onClick={()=>removeCabinet(selected[0])}><Trash2 size={13}/> Remove {selected[0]||''}</button><button type="button" data-testid="reset-arrangement" onClick={resetArrangement}>Reset to layout</button><button type="button" className="accent" data-testid="done-arranging" onClick={()=>setArrange(false)}><Check size={13}/> Done</button></div>
    {mergeOpen&&<MergeDialog open={mergeOpen} onOpenChange={setMergeOpen}/>}
  </div>;
}
