import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const DEFAULT_CONFIG = {layout:'l-shape',finish:'oak',style:'slab',countertop:'calacatta',surface:'honed',backsplash:'tile',hardware:'brass',island:true,ceiling:false,ceiling_opacity:.08,rack:'none',dimensions:true,units:'mm',lighting:'daylight',widths:{},groups:[],quote:{show_prices:true,include_hardware:true,include_labor:true,include_finish:true,labor_rate:65}};
const defaultBrand = {name:'3D Learning Family',subtitle:'Project Zero — Kitchen Visualizer',accent:'#dca55e',logo_url:''};
const Context=createContext(null);
const readLocal=()=>{try {return JSON.parse(localStorage.getItem('kitchen-studio')||'null');}catch{return null;}};

export function StudioProvider({children}) {
  const initial=useRef(readLocal());
  const [config,setConfig]=useState(()=>({...DEFAULT_CONFIG,...initial.current?.configuration,quote:{...DEFAULT_CONFIG.quote,...initial.current?.configuration?.quote}}));
  const [brand,setBrand]=useState(()=>{
    const previous=initial.current?.brand;
    if(!previous)return defaultBrand;
    return {...defaultBrand,...previous,subtitle:previous.subtitle==='kitchexxxx xxx xxx'?defaultBrand.subtitle:previous.subtitle};
  });
  const [projectId]=useState(initial.current?.id||crypto.randomUUID());
  const [scene,setScene]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
  const [selected,setSelected]=useState(['B01']),[explode,setExplode]=useState(0),[inspected,setInspected]=useState(null);
  const [camera,setCamera]=useState({view:'perspective',tick:0}),[mobilePanel,setMobilePanel]=useState(null),[presentation,setPresentation]=useState(false);
  const [tab,setTab]=useState('cabinets'),[saved,setSaved]=useState(false),[retry,setRetry]=useState(0);
  const update=patch=>{setConfig(prev=>({...prev,...patch}));setSaved(false);};
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setBusy(true);
      try {const {data}=await axios.post(`${API}/configure`,config,{signal:controller.signal});setScene(data);setError('');setSelected(ids=>{const valid=ids.filter(id=>data.cabinets.some(c=>c.id===id));return valid.length?valid:[data.cabinets[0].id];});}
      catch(e){if(!axios.isCancel(e))setError('The studio could not connect. Your design is safe.');}
      finally{if(!controller.signal.aborted)setBusy(false);}
    },120);
    return()=>{clearTimeout(timer);controller.abort();};
  },[config,retry]);
  useEffect(()=>{localStorage.setItem('kitchen-studio',JSON.stringify({id:projectId,configuration:config,brand}));document.documentElement.style.setProperty('--studio-accent',brand.accent);},[config,brand,projectId]);
  const selectCabinet=id=>{const group=config.groups.find(g=>g.includes(id));setSelected(group||[id]);setInspected(null);};
  const save=async()=>{setSaving(true);try {await axios.put(`${API}/projects/${projectId}`,{id:projectId,name:'The Atelier Kitchen',configuration:config,brand});setSaved(true);toast.success('Design saved');}catch {toast.error('Could not save. Your local design is still available.');}finally{setSaving(false);}};
  const reset=()=>{setConfig({...DEFAULT_CONFIG});setSelected(['B01']);setExplode(0);setInspected(null);setSaved(false);toast.success('Kitchen reset to the original concept');};
  const group=config.groups.find(g=>g.some(id=>selected.includes(id)));
  useEffect(()=>{document.title=`${brand.name || '3D Learning Family'} — ${brand.subtitle || 'Project Zero — Kitchen Visualizer'}`;},[brand.name,brand.subtitle]);
  return <Context.Provider value={{config,update,brand,setBrand,scene,error,busy,selected,setSelected,selectCabinet,explode,setExplode,inspected,setInspected,camera,setCamera,mobilePanel,setMobilePanel,presentation,setPresentation,tab,setTab,save,saving,saved,reset,group,retry:()=>setRetry(n=>n+1)}}>{children}</Context.Provider>;
}
export const useStudio=()=>useContext(Context);