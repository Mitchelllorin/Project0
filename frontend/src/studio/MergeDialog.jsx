import React,{useEffect,useState} from 'react';
import {Box,Link2} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {toast} from 'sonner';
import axios from 'axios';
import {useStudio,API} from './StudioContext';
import {formatDimension,money} from './engine';

// Merging neighbouring cabinets turns them into one run — and that is not a label.
// The joint gables come out and one shared partition goes in, so the cut list, the
// panel count and the quote all move (see backend/recipe.py). The panel therefore
// asks the server what the merge would do as soon as a pair is ticked and says so
// before you commit: a merge that quietly repriced the job would be worse than no
// merge at all, and the old copy here claimed "every child part stays intact",
// which stopped being true the moment the engine learned to fuse a run.
//
// Extracted from the inspector so the layout widget can offer the same merge
// without pulling the 3D inspector panel into its module graph.
export function MergeDialog({open,onOpenChange}) {
  const {config,update,scene,selected,setSelected}=useStudio();
  const [ids,setIds]=useState(selected),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  // The preview answers with `geometry_fused` (did the joint actually come out) and
  // `saving` (what that is worth). Both are read by name, so a rename on the server
  // is a failing test rather than a dialog that quietly claims nothing can be merged.
  const [effect,setEffect]=useState(null);

  useEffect(()=>{if(open)setEffect(null);},[open]);

  // Ask what the run would cost before anyone commits to it. Debounced, because
  // ticking four boxes should not be four round trips.
  useEffect(()=>{
    if(!open||ids.length<2)return;
    let live=true;
    const timer=setTimeout(()=>{
      axios.post(`${API}/groups/preview`,{configuration:config,cabinet_ids:ids})
        .then(response=>{if(live)setEffect(response.data);})
        .catch(()=>{if(live)setEffect(null);});
    },250);
    return()=>{live=false;clearTimeout(timer);};
  },[open,ids,config]);

  const merge=async()=>{
    setLoading(true);setError('');
    try{
      await axios.post(`${API}/groups/preview`,{configuration:config,cabinet_ids:ids});
      update({groups:[...config.groups.filter(g=>!g.some(id=>ids.includes(id))),ids]});
      setSelected(ids);onOpenChange(false);
      toast.success(effect&&effect.geometry_fused
        ?`${ids.length} cabinets fused into one run · ${effect.shared_gable_allowance} gable${effect.shared_gable_allowance===1?'':'s'} and ${effect.carcasses_saved} carcass${effect.carcasses_saved===1?'':'es'} saved · ${money(effect.saving,2)} off`
        :`${ids.length} cabinets merged into one logical unit`);
    }catch(e){setError(e.response?.data?.detail||'Could not merge these cabinets.');}
    finally{setLoading(false);}
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="studio-dialog" data-testid="merge-dialog"><DialogTitle data-testid="merge-dialog-title">Better together.</DialogTitle><DialogDescription data-testid="merge-dialog-description">Choose neighboring cabinets for one run. The gables at the joint are shared between them — everything else on every cabinet stays exactly as it is.</DialogDescription><div className="merge-choices">{scene.cabinets.map(c=><label key={c.id} className={ids.includes(c.id)?'checked':''}><input type="checkbox" data-testid={`merge-select-${c.id}`} checked={ids.includes(c.id)} onChange={e=>setIds(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/><Box size={20}/><span><strong>{c.id} · {c.name}</strong><small>{formatDimension(c.width,config.units)}</small></span></label>)}</div>{effect&&<p className={effect.geometry_fused?'merge-effect':'merge-effect merge-effect-blocked'} data-testid="merge-effect">{effect.geometry_fused?`Fuses into a ${formatDimension(effect.run_length,config.units)} run: ${effect.shared_gable_allowance} joint gable${effect.shared_gable_allowance===1?'':'s'} removed and ${effect.carcasses_saved} carcass${effect.carcasses_saved===1?'':'es'} fewer to assemble — ${money(effect.saving,2)} off this run.`:(effect.runs&&effect.runs[0]&&effect.runs[0].reason)||'These cabinets cannot be built as one run.'}</p>}{error&&<p className="error-message" data-testid="merge-error">{error}</p>}<Button className="accent-button" data-testid="confirm-merge-button" disabled={ids.length<2||loading} onClick={merge}><Link2 size={15}/>{loading?'Merging…':`Merge ${ids.length} cabinets`}</Button></DialogContent></Dialog>;
}
