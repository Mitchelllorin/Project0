import React from 'react';
import {Check,ChevronDown,SlidersHorizontal} from 'lucide-react';
import {Switch} from '../components/ui/switch';
import {useStudio} from './StudioContext';

export const SectionHeading=({children,detail})=><div className="section-heading" data-testid={`heading-${String(children).toLowerCase().replace(/[^a-z0-9]+/g,'-')}`}><h2>{children}</h2>{detail&&<span>{detail}</span>}</div>;
export const Toggle=({id,label,checked,onChange,detail})=><div className="toggle-row"><div><label htmlFor={id}>{label}</label>{detail&&<small data-testid={`${id}-detail`}>{detail}</small>}</div><Switch id={id} data-testid={id} checked={checked} onCheckedChange={onChange} aria-label={label}/></div>;
export const Select=({id,label,value,onChange,children})=><label className="select-label" htmlFor={id}>{label&&<span>{label}</span>}<div className="select-wrap"><select id={id} data-testid={id} value={value} onChange={e=>onChange(e.target.value)}>{children}</select><ChevronDown size={14}/></div></label>;

function FinishSwatches(){
  const {config,update}=useStudio();
  const finishes=[['oak','Natural oak'],['walnut','Walnut'],['sage','Sage'],['ivory','Ivory'],['charcoal','Charcoal']];
  return <><SectionHeading detail="05 finishes">Cabinet finish</SectionHeading><div className="swatch-grid">{finishes.map(([key,label])=><button key={key} className={`swatch-option ${config.finish===key?'selected':''}`} data-testid={`material-swatch-${key}`} aria-label={label} aria-pressed={config.finish===key} onClick={()=>update({finish:key})}><span className={`swatch swatch-${key}`}>{config.finish===key&&<Check size={15}/>}</span><span>{label}</span></button>)}</div><div className="finish-readout" data-testid="finish-readout"><span className={`material-dot swatch-${config.finish}`}/>{finishes.find(f=>f[0]===config.finish)?.[1]}<span>Matte finish</span></div></>;
}
export function Configurator(){
  const {config,update,tab,scene}=useStudio();
  return <div className="configurator" data-testid="configurator-panel">
    <div className="panel-title"><div><span className="overline">MAKE IT YOURS</span><h2 data-testid="configurator-heading">{tab==='layout'?'Space & layout':tab==='ceiling'?'Above the kitchen':'Design palette'}</h2></div><SlidersHorizontal size={17}/></div>
    {tab==='layout'?<>
      <section><SectionHeading>Kitchen layout</SectionHeading><div className="layout-options">{[['l-shape','L-shaped'],['straight','Linear'],['galley','Galley']].map(([value,name])=><button data-testid={`layout-${value}`} className={config.layout===value?'selected':''} key={value} onClick={()=>update({layout:value,groups:[]})}><span className={`layout-diagram ${value}`}/><span>{name}</span>{config.layout===value&&<Check size={14}/>}</button>)}</div></section>
      <section><Toggle id="island-toggle" label="Kitchen island" checked={config.island} onChange={v=>update({island:v,groups:[]})}/><Toggle id="dimensions-toggle" label="Show dimensions" checked={config.dimensions} onChange={v=>update({dimensions:v})}/></section>
      <section><SectionHeading>Cabinet widths</SectionHeading>{scene?.cabinets.filter(c=>!c.id.startsWith('I')&&c.kind!=='corner').map(c=><Select key={c.id} id={`width-${c.id}`} label={`${c.id} · ${c.name}`} value={config.widths[c.id]||c.width} onChange={v=>update({widths:{...config.widths,[c.id]:Number(v)}})}>{Array.from({length:11},(_,i)=><option key={i} value={Number(((i+6)*76.2).toFixed(1))}>{(i+6)*3} in / {Math.round((i+6)*76.2)} mm</option>)}</Select>)}</section>
    </>:tab==='ceiling'?<>
      <section><SectionHeading>Ceiling layer</SectionHeading><Toggle id="ceiling-toggle" label="Visible ceiling" checked={config.ceiling} onChange={v=>update({ceiling:v})}/><label className="range-label" htmlFor="ceiling-opacity">Opacity <span data-testid="ceiling-opacity-value">{Math.round(config.ceiling_opacity*100)}%</span></label><input type="range" id="ceiling-opacity" data-testid="ceiling-opacity" min="0" max="1" step=".01" value={config.ceiling_opacity} onChange={e=>update({ceiling_opacity:Number(e.target.value)})}/></section>
      <section><SectionHeading>Hanging pot rack</SectionHeading><div className="rack-options">{[['none','No rack'],['steel','Industrial steel'],['wood','Oak beam'],['brass','Brass ring'],['grid','Modern grid']].map(([value,label])=><button key={value} data-testid={`pot-rack-${value}`} className={config.rack===value?'selected':''} onClick={()=>update({rack:value})}><span className={`rack-preview rack-${value}`}><i/><i/><i/></span><span>{label}</span>{config.rack===value&&<Check size={14}/>}</button>)}</div></section>
    </>:<>
      <section><SectionHeading>Door style</SectionHeading><div className="style-options">{[['slab','Modern slab'],['shaker','Shaker'],['fluted','Fluted']].map(([key,label])=><button key={key} className={config.style===key?'selected':''} data-testid={`style-${key}`} onClick={()=>update({style:key})}><span className={`door-preview door-${key}`}><i/></span><span>{label}</span></button>)}</div></section>
      <section><FinishSwatches/></section>
      <section><SectionHeading>Countertop</SectionHeading><div className="counter-options">{[['calacatta','Calacatta'],['concrete','Concrete'],['noir','Noir stone']].map(([key,label])=><button key={key} data-testid={`countertop-${key}`} className={config.countertop===key?'selected':''} onClick={()=>update({countertop:key})}><span className={`counter-preview counter-${key}`}>{config.countertop===key&&<Check size={13}/>}</span><span>{label}</span></button>)}</div><div className="surface-row"><span>Surface</span><div className="small-segment">{['honed','polished'].map(key=><button key={key} data-testid={`surface-${key}`} onClick={()=>update({surface:key})} className={config.surface===key?'active':''}>{key}</button>)}</div></div></section>
      <section><SectionHeading>Backsplash</SectionHeading><Select id="backsplash-select" value={config.backsplash} onChange={v=>update({backsplash:v})}><option value="tile">Hand-glazed subway tile</option><option value="marble">Full-height Calacatta</option><option value="none">Painted wall</option></Select></section>
      <section><SectionHeading>Hardware</SectionHeading><div className="hardware-options">{[['brass','Brushed brass'],['black','Matte black'],['steel','Steel']].map(([key,label])=><button key={key} title={label} data-testid={`hardware-${key}`} className={config.hardware===key?'selected':''} onClick={()=>update({hardware:key})}><span className={`handle-preview handle-${key}`}/><span>{label}</span></button>)}</div></section>
    </>}
    <div className="panel-footnote" data-testid="material-specification"><span className="status-dot"/> Original Euro / 32 mm collection</div>
  </div>;
}