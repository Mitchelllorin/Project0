import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { applyPalette, DEFAULT_PALETTE } from './palette';
import { encodeState, readShareHash } from './share';

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const DEFAULT_CONFIG = {layout:'l-shape',finish:'oak',style:'slab',countertop:'calacatta',surface:'honed',backsplash:'tile',hardware:'brass',island:true,ceiling:false,ceiling_opacity:.08,rack:'none',dimensions:true,units:'mm',lighting:'daylight',widths:{},groups:[],custom:false,placements:[],quote:{show_prices:true,include_hardware:true,include_labor:true,include_finish:true,labor_rate:65}};
const defaultBrand = {name:'3D Learning Family',subtitle:'Project Zero — Kitchen Visualizer',accent:'#dca55e',logo_url:''};
const Context=createContext(null);
const readLocal=()=>{try {return JSON.parse(localStorage.getItem('kitchen-studio')||'null');}catch{return null;}};
const readPalette=()=>{try {return JSON.parse(localStorage.getItem('kitchen-studio-palette')||'null');}catch{return null;}};
const readHash=()=>readShareHash(window.location.hash);

export function StudioProvider({children}) {
  const shared=readHash();
  const initial=useRef(shared?{id:shared.id,configuration:shared.configuration,brand:shared.brand}:readLocal());
  const [config,setConfig]=useState(()=>({...DEFAULT_CONFIG,...initial.current?.configuration,quote:{...DEFAULT_CONFIG.quote,...initial.current?.configuration?.quote}}));
  const [brand,setBrand]=useState(()=>{
    const previous=initial.current?.brand;
    if(!previous)return defaultBrand;
    return {...defaultBrand,...previous,subtitle:previous.subtitle==='kitchexxxx xxx xxx'?defaultBrand.subtitle:previous.subtitle};
  });
  const [projectId]=useState(initial.current?.id||crypto.randomUUID());
  const [palette,setPaletteState]=useState(()=>shared?.palette||readPalette()||{...DEFAULT_PALETTE});
  const setPalette=patch=>setPaletteState(prev=>({...prev,...patch}));
  useEffect(()=>{applyPalette(palette);try{localStorage.setItem('kitchen-studio-palette',JSON.stringify(palette));}catch{}},[palette]);
  const [scene,setScene]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
  const [selected,setSelected]=useState(['B01']),[explode,setExplode]=useState(0),[inspected,setInspected]=useState(null);
  const [doorsOpen,setDoorsOpen]=useState(false);
  const [arrange,setArrange]=useState(false),[gizmoMode,setGizmoMode]=useState('translate');
  const [camera,setCamera]=useState({view:'perspective',tick:0}),[mobilePanel,setMobilePanel]=useState(null),[presentation,setPresentation]=useState(false);
  const [tab,setTab]=useState('cabinets'),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0);
  const [history,setHistory]=useState([]),[future,setFuture]=useState([]);
  const update=patch=>{setHistory(h=>[...h.slice(-49),config]);setFuture([]);setConfig(prev=>({...prev,...patch}));setSaved(false);};
  const undo=()=>{if(!history.length)return;const previous=history[history.length-1];setHistory(h=>h.slice(0,-1));setFuture(f=>[config,...f].slice(0,50));setConfig(previous);setSaved(false);};
  const redo=()=>{if(!future.length)return;const next=future[0];setFuture(f=>f.slice(1));setHistory(h=>[...h.slice(-49),config]);setConfig(next);setSaved(false);};
  const canUndo=history.length>0,canRedo=future.length>0;
  const share=()=>{
    const encoded=encodeState({id:projectId,configuration:config,brand,palette});
    const url=`${window.location.origin}${window.location.pathname}#d=${encoded}`;
    try{window.history.replaceState(null,'',`#d=${encodeURIComponent(encoded)}`);}catch{/* history unavailable */}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(()=>toast.success('Share link copied to the clipboard')).catch(()=>toast.error('Could not copy the link'));
    else toast.error('Clipboard unavailable in this browser');
    return url;
  };
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setBusy(true);
      try {const {data}=await axios.post(`${API}/configure`,config,{signal:controller.signal});setScene(data);setError('');setSelected(ids=>{const valid=ids.filter(id=>data.cabinets.some(c=>c.id===id));return valid.length?valid:[data.cabinets[0].id];});}
      catch(e){if(!axios.isCancel(e))setError(`The studio could not reach the assembly service${process.env.REACT_APP_BACKEND_URL?` at ${process.env.REACT_APP_BACKEND_URL}`:''}. Your design is safe.`);}
      finally{if(!controller.signal.aborted)setBusy(false);}
    },120);
    return()=>{clearTimeout(timer);controller.abort();};
  },[config,retry]);
  useEffect(()=>{localStorage.setItem('kitchen-studio',JSON.stringify({id:projectId,configuration:config,brand}));document.documentElement.style.setProperty('--studio-accent',brand.accent);},[config,brand,projectId]);
  const selectCabinet=id=>{const group=config.groups.find(g=>g.includes(id));setSelected(group||[id]);setInspected(null);};
  const save=async()=>{setSaving(true);try {await axios.put(`${API}/projects/${projectId}`,{id:projectId,name:'The Atelier Kitchen',configuration:config,brand});setSaved(true);toast.success('Design saved');}catch {toast.error('Could not save. Your local design is still available.');}finally{setSaving(false);}};
  const reset=()=>{setHistory(h=>[...h.slice(-49),config]);setFuture([]);setConfig({...DEFAULT_CONFIG});setSelected(['B01']);setExplode(0);setInspected(null);setSaved(false);toast.success('Kitchen reset to the original concept');};
  // Free arrangement: placements are explicit cabinet transforms, edited with the gizmo.
  const asPlacements=()=>config.placements&&config.placements.length?config.placements:(scene?scene.cabinets.map(c=>({id:c.id,kind:c.kind,width:c.width,x:c.position[0],z:c.position[2],rotation:c.rotation})):[]);
  const moveCabinet=(id,x,z,rotation)=>update({custom:true,placements:asPlacements().map(p=>p.id===id?{...p,x:Math.round(x),z:Math.round(z),rotation:Number(rotation.toFixed(4))}:p)});
  const addCabinet=kind=>{const list=asPlacements().slice();const id=`N${String(list.filter(p=>p.id.startsWith('N')).length+1).padStart(2,'0')}`;const right=list.reduce((m,p)=>Math.max(m,p.x+(p.width||762)/2),0);list.push({id,kind,width:kind==='corner'||kind==='corner-out'?914.4:762,x:Math.round(right+600),z:304.8,rotation:0});update({custom:true,placements:list});setSelected([id]);};
  const removeCabinet=id=>{const list=asPlacements().filter(p=>p.id!==id);update({custom:true,placements:list,groups:config.groups.filter(g=>!g.includes(id)).map(g=>g.filter(x=>x!==id)).filter(g=>g.length>1)});setSelected(list.length?[list[0].id]:[]);};
  const setCabinetWidth=(id,width)=>update({custom:true,placements:asPlacements().map(p=>p.id===id?{...p,width}:p)});
  const resetArrangement=()=>update({custom:false,placements:[]});
  const group=config.groups.find(g=>g.some(id=>selected.includes(id)));
  useEffect(()=>{document.title=`${brand.name || '3D Learning Family'} — ${brand.subtitle || 'Project Zero — Kitchen Visualizer'}`;},[brand.name,brand.subtitle]);
  return <Context.Provider value={{config,update,brand,setBrand,scene,error,busy,selected,setSelected,selectCabinet,explode,setExplode,inspected,setInspected,camera,setCamera,mobilePanel,setMobilePanel,presentation,setPresentation,tab,setTab,save,saving,saved,reset,group,undo,redo,canUndo,canRedo,palette,setPalette,doorsOpen,setDoorsOpen,arrange,setArrange,gizmoMode,setGizmoMode,addCabinet,removeCabinet,moveCabinet,setCabinetWidth,resetArrangement,share,retry:()=>setRetry(n=>n+1)}}>{children}</Context.Provider>;
}
export const useStudio=()=>useContext(Context);