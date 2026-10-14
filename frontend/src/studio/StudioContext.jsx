import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { applyPalette, DEFAULT_PALETTE } from './palette';
import { pickedAfterToggle } from './doors';
import { morphPlacement } from './layoutWidget';
import { encodeState, readShareHash } from './share';
import { buildTimeDeployment, fetchDeployment, initialBrand, adoptServerBrand } from './deployment';
import { API_BASE } from './api';
import { readDealerCode, rememberDealerCode, forgetDealerCode, dealerHeaders, fetchDealerSession } from './dealer';
import { newId } from './ids';

// The base is resolved rather than taken raw: a baked-in localhost is the browser's
// own machine, which is only right when the studio is being served from it (see api.js).
export const API = `${API_BASE}/api`;
export const DEFAULT_CONFIG = {layout:'l-shape',finish:'oak',style:'slab',countertop:'calacatta',surface:'honed',backsplash:'tile',hardware:'brass',island:true,ceiling:false,ceiling_opacity:.08,rack:'none',dimensions:true,units:'mm',lighting:'daylight',studs:false,stud_spacing:600,widths:{},groups:[],custom:false,placements:[],quote:{show_prices:true,include_hardware:true,include_labor:true,include_finish:true,labor_rate:65,resale_discount:0}};
// This install's own identity, baked in at build time. A visitor's saved or shared
// branding overrides it; the server's copy (fetched below) can re-brand a running
// deployment without a rebuild.
const DEPLOYMENT = buildTimeDeployment();
const Context=createContext(null);
const readLocal=()=>{try {return JSON.parse(localStorage.getItem('kitchen-studio')||'null');}catch{return null;}};
const readPalette=()=>{try {return JSON.parse(localStorage.getItem('kitchen-studio-palette')||'null');}catch{return null;}};
const readHash=()=>readShareHash(window.location.hash);

export function StudioProvider({children}) {
  const shared=readHash();
  const initial=useRef(shared?{id:shared.id,configuration:shared.configuration,brand:shared.brand}:readLocal());
  const [config,setConfig]=useState(()=>({...DEFAULT_CONFIG,...initial.current?.configuration,quote:{...DEFAULT_CONFIG.quote,...initial.current?.configuration?.quote}}));
  // A drag reads the configuration on every frame; a ref keeps that read current even
  // while the state it is reading is still being committed.
  const configRef=useRef(config);configRef.current=config;
  const [brand,setBrand]=useState(()=>initialBrand(initial.current?.brand));
  // Lazily, and through ids.js: `crypto.randomUUID()` is not defined outside a secure
  // context, and calling it here — during the first render of the provider — took the
  // whole studio down before it painted on any plain-http address that was not localhost.
  const [projectId]=useState(()=>initial.current?.id||newId());
  // The dealer this browser is signed in as, and the code that earns it. The code lives in
  // the ref rather than the state the whole tree re-renders on, and never anywhere it could
  // travel with the design.
  const [dealer,setDealer]=useState(null),[dealerBusy,setDealerBusy]=useState(false);
  const dealerCode=useRef(readDealerCode());
  const [palette,setPaletteState]=useState(()=>shared?.palette||readPalette()||{...DEFAULT_PALETTE});
  const setPalette=patch=>setPaletteState(prev=>({...prev,...patch}));
  useEffect(()=>{applyPalette(palette);try{localStorage.setItem('kitchen-studio-palette',JSON.stringify(palette));}catch{}},[palette]);
  const [scene,setScene]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
  const [selected,setSelected]=useState(['B01']),[explode,setExplode]=useState(0),[inspected,setInspected]=useState(null);
  const [doorsOpen,setDoorsOpen]=useState(false);
  const toggleDoors=()=>{picked.current=pickedAfterToggle(doorsOpen,picked.current);setDoorsOpen(!doorsOpen);};
  // Set the first time a cabinet is chosen. The initial selection is not a
  // choice, so it must not swing any doors open on load.
  const picked=useRef(false);
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
      try {const {data}=await axios.post(`${API}/configure`,config,{signal:controller.signal,headers:dealerHeaders(dealerCode.current)});setScene(data);setError('');setSelected(ids=>{const valid=ids.filter(id=>data.cabinets.some(c=>c.id===id));return valid.length?valid:[data.cabinets[0].id];});}
      catch(e){
        if(axios.isCancel(e))return;
        // An account whose code was rotated or revoked is dropped back to list pricing — once,
        // and out loud — rather than left behind a connection error.
        if(e.response?.status===401&&dealer){forgetDealerCode();dealerCode.current='';setDealer(null);toast.error('Your dealer access code is no longer valid. Pricing is back to list.');}
        else setError(`The studio could not reach the assembly service${process.env.REACT_APP_BACKEND_URL?` at ${process.env.REACT_APP_BACKEND_URL}`:''}. Your design is safe.`);}
      finally{if(!controller.signal.aborted)setBusy(false);}
    },120);
    return()=>{clearTimeout(timer);controller.abort();};
  },[config,retry,dealer]);
  useEffect(()=>{localStorage.setItem('kitchen-studio',JSON.stringify({id:projectId,configuration:config,brand}));document.documentElement.style.setProperty('--studio-accent',brand.accent);},[config,brand,projectId]);
  // Adopt the identity the server was configured with, unless this visitor already has
  // one of their own — a saved design, a share link, or branding they are editing now.
  useEffect(()=>{
    let cancelled=false;
    fetchDeployment(API).then(deployment=>{
      if(cancelled||!deployment)return;
      setBrand(prev=>adoptServerBrand(prev,deployment.brand));
      if(deployment.catalog)setConfig(prev=>prev.catalog?prev:{...prev,catalog:deployment.catalog});
    });
    return()=>{cancelled=true;};
  },[]);
  // A stored code is only forgotten when the server *rejects* it. An API that is merely
  // unreachable must not cost a dealer their sign-in.
  useEffect(()=>{
    const code=dealerCode.current;
    if(!code)return;
    let cancelled=false;
    fetchDealerSession(API,code).then(({dealer:found,status,message})=>{
      if(cancelled)return;
      if(found){setDealer(found);return;}
      if(status===401||status===503){forgetDealerCode();dealerCode.current='';toast.error(message);}
    });
    return()=>{cancelled=true;};
  },[]);
  // Resolves the code on the server and keeps it in this browser. Returns '' on success
  // and a sentence to show the dealer otherwise.
  const signInDealer=async code=>{
    const offered=typeof code==='string'?code.trim():'';
    if(!offered)return 'Enter the access code your manufacturer gave you.';
    setDealerBusy(true);
    try{
      const {dealer:found,status,message}=await fetchDealerSession(API,offered);
      if(!found)return status===503?'Dealer sign-in is not switched on for this deployment.':(message||'That access code was not accepted.');
      const remembered=rememberDealerCode(offered);
      if(!remembered)return 'That access code is longer than any code this deployment issues.';
      dealerCode.current=remembered;setDealer(found);
      toast.success(`Signed in as ${found.name} on ${found.tier_name} pricing`);
      return '';
    } finally {setDealerBusy(false);}
  };
  const signOutDealer=()=>{forgetDealerCode();dealerCode.current='';setDealer(null);toast.success('Signed out. Pricing is back to list.');};
  const selectCabinet=id=>{picked.current=true;const group=config.groups.find(g=>g.includes(id));setSelected(group||[id]);setInspected(null);};
  const save=async()=>{setSaving(true);try {await axios.put(`${API}/projects/${projectId}`,{id:projectId,name:'The Atelier Kitchen',configuration:config,brand});setSaved(true);toast.success('Design saved');}catch {toast.error('Could not save. Your local design is still available.');}finally{setSaving(false);}};
  const reset=()=>{setHistory(h=>[...h.slice(-49),config]);setFuture([]);setConfig({...DEFAULT_CONFIG});setSelected(['B01']);setExplode(0);setInspected(null);setSaved(false);toast.success('Kitchen reset to the original concept');};
  // Free arrangement: placements are explicit cabinet transforms, edited with the gizmo.
  const asPlacements=()=>config.placements&&config.placements.length?config.placements:(scene?scene.cabinets.map(c=>({id:c.id,kind:c.kind,width:c.width,x:c.position[0],z:c.position[2],rotation:c.rotation})):[]);
  const moveCabinet=(id,x,z,rotation)=>update({custom:true,placements:asPlacements().map(p=>p.id===id?{...p,x:Math.round(x),z:Math.round(z),rotation:Number(rotation.toFixed(4))}:p)});
  const addCabinet=kind=>{const list=asPlacements().slice();const id=`N${String(list.filter(p=>p.id.startsWith('N')).length+1).padStart(2,'0')}`;const right=list.reduce((m,p)=>Math.max(m,p.x+(p.width||762)/2),0);list.push({id,kind,width:kind==='corner'||kind==='corner-out'?914.4:762,x:Math.round(right+600),z:304.8,rotation:0});update({custom:true,placements:list});setSelected([id]);};
  const removeCabinet=id=>{const list=asPlacements().filter(p=>p.id!==id);update({custom:true,placements:list,groups:config.groups.filter(g=>!g.includes(id)).map(g=>g.filter(x=>x!==id)).filter(g=>g.length>1)});setSelected(list.length?[list[0].id]:[]);};
  const setCabinetWidth=(id,width)=>update({custom:true,placements:asPlacements().map(p=>p.id===id?{...p,width}:p)});
  // Pulling the end of a cabinet emits a value per frame. Only the release is worth an
  // undo step, or one stretch would fill the history with every frame it passed through.
  const resizeCabinet=(id,width,x,z,live)=>{
    const place=p=>({...p,width:Math.round(width),x:Math.round(x),z:Math.round(z)});
    const next=prev=>{const base=prev.placements&&prev.placements.length?prev.placements:asPlacements();return {...prev,custom:true,placements:base.map(p=>p.id===id?place(p):p)};};
    if(live)setConfig(next);else update(next(configRef.current));
  };
  // Turning a placed cabinet into a different cabinet. The engine re-cuts it from the
  // catalog, so the panels, the hardware and the price all follow from one word changing.
  const morphCabinet=(id,kind)=>update({custom:true,placements:asPlacements().map(p=>p.id===id?morphPlacement(p,kind):p)});
  const resetArrangement=()=>update({custom:false,placements:[]});
  const group=config.groups.find(g=>g.some(id=>selected.includes(id)));
  useEffect(()=>{document.title=`${brand.name || '3D Learning Family'} — ${brand.subtitle || 'Project Zero — Kitchen Visualizer'}`;},[brand.name,brand.subtitle]);
  return <Context.Provider value={{config,update,brand,setBrand,deployment:DEPLOYMENT,scene,error,busy,selected,setSelected,selectCabinet,explode,setExplode,inspected,setInspected,camera,setCamera,mobilePanel,setMobilePanel,presentation,setPresentation,tab,setTab,save,saving,saved,reset,group,undo,redo,canUndo,canRedo,dealer,dealerBusy,signInDealer,signOutDealer,palette,setPalette,doorsOpen,toggleDoors,arrange,setArrange,gizmoMode,setGizmoMode,addCabinet,removeCabinet,moveCabinet,setCabinetWidth,resizeCabinet,morphCabinet,resetArrangement,picked:picked.current,share,retry:()=>setRetry(n=>n+1)}}>{children}</Context.Provider>;
}
export const useStudio=()=>useContext(Context);