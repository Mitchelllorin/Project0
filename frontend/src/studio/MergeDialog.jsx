import React,{useState} from 'react';
import {Box,Link2} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {toast} from 'sonner';
import axios from 'axios';
import {useStudio,API} from './StudioContext';
import {formatDimension} from './engine';

// Merging turns neighbouring cabinets into one logical unit: the assembly
// explorer and the quote read the run as a single piece, while every child part
// stays intact. Extracted from the inspector so the layout widget can offer the
// same merge without pulling the 3D inspector panel into its module graph.
export function MergeDialog({open,onOpenChange}) {
  const {config,update,scene,selected,setSelected}=useStudio();
  const [ids,setIds]=useState(selected),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const merge=async()=>{setLoading(true);setError('');try{await axios.post(`${API}/groups/preview`,{configuration:config,cabinet_ids:ids});update({groups:[...config.groups.filter(g=>!g.some(id=>ids.includes(id))),ids]});setSelected(ids);onOpenChange(false);toast.success(`${ids.length} cabinets merged into one logical unit`);}catch(e){setError(e.response?.data?.detail||'Could not merge these cabinets.');}finally{setLoading(false);}};
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="studio-dialog" data-testid="merge-dialog"><DialogTitle data-testid="merge-dialog-title">Better together.</DialogTitle><DialogDescription data-testid="merge-dialog-description">Choose neighboring cabinets for one logical unit. Every child part stays intact.</DialogDescription><div className="merge-choices">{scene.cabinets.map(c=><label key={c.id} className={ids.includes(c.id)?'checked':''}><input type="checkbox" data-testid={`merge-select-${c.id}`} checked={ids.includes(c.id)} onChange={e=>setIds(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/><Box size={20}/><span><strong>{c.id} · {c.name}</strong><small>{formatDimension(c.width,config.units)}</small></span></label>)}</div>{error&&<p className="error-message" data-testid="merge-error">{error}</p>}<Button className="accent-button" data-testid="confirm-merge-button" disabled={ids.length<2||loading} onClick={merge}><Link2 size={15}/>{loading?'Merging…':`Merge ${ids.length} cabinets`}</Button></DialogContent></Dialog>;
}
