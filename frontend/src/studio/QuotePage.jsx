import React,{useState} from 'react';
import {Download,FileText,Settings2,Printer,FileJson} from 'lucide-react';
import {useStudio} from './StudioContext';
import {money as formatMoney,formatDimension} from './engine';
import {Button} from '../components/ui/button';
import {Toggle} from './Controls';
import {toast} from 'sonner';
const money=value=>formatMoney(value,2);

export default function QuotePage(){
  const {scene,config,update,busy,brand}=useStudio();const [filter,setFilter]=useState('all');
  const q=scene.quote,prices=config.quote.show_prices;
  const lines=q.lines.filter(l=>filter==='all'||l.category===filter);
  const setting=(k,v)=>update({quote:{...config.quote,[k]:v}});
  const download=()=>{
    const rows=[['Component','Category','Quantity',...(prices?['Unit price USD','Total USD']:[])],...q.lines.map(l=>[l.name,l.category,l.quantity,...(prices?[l.unit_price,l.total]:[])]),...(prices?[["Finishing","service",1,q.finishing,q.finishing],["Assembly labor","service",1,q.labor,q.labor],["ILLUSTRATIVE TOTAL — NOT A BINDING QUOTE","",'', '',q.total]]:[])];
    const blob=new Blob([rows.map(r=>r.map(c=>`"${String(c).replaceAll('"','""')}"`).join(',')).join('\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='atelier-kitchen-bom.csv';a.click();URL.revokeObjectURL(url);toast.success('Bill of materials downloaded');
  };
  const esc=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // Branded quotation as a print-ready document — the browser's "Save as PDF" produces the handout.
  const print=()=>{
    const w=window.open('','_blank');
    if(!w){toast.error('Allow pop-ups to print the quote');return;}
    const rows=q.lines.map(l=>`<tr><td>${esc(l.name)}<span>${esc(l.category)}</span></td><td class="n">${l.quantity}</td>${prices?`<td class="n">${money(l.unit_price)}</td><td class="n">${money(l.total)}</td>`:''}</tr>`).join('');
    const summary=[['Layout',config.layout],['Finish',config.finish],['Door style',config.style],['Countertop',config.countertop],['Surface',config.surface],['Backsplash',config.backsplash],['Hardware',config.hardware],['Units',config.units]].map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(brand.name)} quotation</title><style>
*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d211e;margin:0;padding:46px 52px;font-size:12px}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1d211e;padding-bottom:18px}
h1{font-size:23px;margin:0}.sub{color:#6b7468;margin-top:5px}h2{font-size:11px;margin:26px 0 10px;text-transform:uppercase;letter-spacing:.09em;color:#6b7468}
.meta{text-align:right;color:#6b7468;line-height:1.8}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0 0}
.grid div span{display:block;color:#8a938a;text-transform:uppercase;letter-spacing:.06em;font-size:9px}
.grid div strong{font-size:13px;text-transform:capitalize}
table{width:100%;border-collapse:collapse}
th{text-align:right;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b7468;padding:8px 10px;border-bottom:1px solid #cfd4cd}
th:first-child{text-align:left}td{padding:9px 10px;border-bottom:1px solid #e4e7e2}td:first-child span{display:block;color:#8a938a;font-size:9px;text-transform:capitalize}
td.n{text-align:right;font-variant-numeric:tabular-nums}
.totals{margin-top:18px;margin-left:auto;width:300px}.totals div{display:flex;justify-content:space-between;padding:7px 0;color:#4c554c}
.totals .grand{border-top:2px solid #1d211e;margin-top:6px;padding-top:12px;font-size:16px;color:#1d211e;font-weight:600}
footer{margin-top:34px;border-top:1px solid #cfd4cd;padding-top:14px;color:#7b847a;font-size:10px;line-height:1.7}
@media print{body{padding:22px}}
</style></head><body><header><div><h1>${esc(brand.name)}</h1><div class="sub">${esc(brand.subtitle)}</div></div><div class="meta"><div>The Atelier Kitchen</div><div>Concept 01 · ${new Date().toLocaleDateString()}</div><div>Illustrative quotation</div></div></header><div class="grid">${summary}</div><h2>Bill of materials</h2><table><thead><tr><th>Component</th><th>Qty</th>${prices?'<th>Unit</th><th>Total</th>':''}</tr></thead><tbody>${rows}</tbody></table>${prices?`<div class="totals"><div><span>Materials &amp; components</span><span>${money(q.subtotal)}</span></div><div><span>Finishing</span><span>${money(q.finishing)}</span></div><div><span>Assembly labour</span><span>${money(q.labor)}</span></div><div class="grand"><span>Project estimate</span><span>${money(q.total)}</span></div></div>`:''}<footer>Illustrative base-cabinet pricing only, including selected surfaces and pot racks. Not a manufacturer quote. Upper cabinets, appliances, styling items, taxes, installation and delivery are excluded. Quantities reconcile to the same configuration that drives the 3D view and assembly.</footer></body></html>`);
    w.document.close();w.focus();w.print();
  };
  // Part-level production BOM: every panel, fitting and fastener with its machining and assembly vector.
  const exportParts=()=>{
    const payload={project:'The Atelier Kitchen',generated:new Date().toISOString(),brand:{name:brand.name,subtitle:brand.subtitle},units:config.units,configuration:config,dimensions:scene.dimensions,quote:{subtotal:q.subtotal,finishing:q.finishing,labor:q.labor,total:q.total,currency:q.currency,illustrative:true},total_parts:Object.values(scene.counts).reduce((a,b)=>a+b,0),cabinets:scene.cabinets.map(c=>({id:c.id,name:c.name,kind:c.kind,width_mm:c.width,height_mm:c.height,depth_mm:c.depth,position_mm:c.position,rotation_rad:c.rotation,parts:c.parts.map(p=>({id:p.id,name:p.name,category:p.category,geometry:p.geometry,material:p.material,size_mm:p.size,position_mm:p.position,assembly_axis:p.assembly_axis,assembly_order:p.assembly_order,parent_id:p.parent_id,unit_price_usd:p.price,machining:p.machining}))}))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='atelier-kitchen-production-bom.json';a.click();URL.revokeObjectURL(url);toast.success('Production BOM exported');
  };
  return <main className="document-page quote-page" data-testid="quote-page"><div className="document-heading"><div><span className="overline">THE ATELIER KITCHEN / PROJECT 01</span><h1 data-testid="quote-heading">A considered design.<br/><span>Every detail accounted for.</span></h1></div><div className="document-actions"><Button className="ghost-button" data-testid="print-quote-button" onClick={print}><Printer size={15}/>Print / PDF</Button><Button className="ghost-button" data-testid="export-parts-button" onClick={exportParts} disabled={busy}><FileJson size={15}/>Production BOM</Button><Button className="accent-button" data-testid="download-bom-button" onClick={download} disabled={busy}><Download size={15}/>Download BOM</Button></div></div>
    <div className="quote-summary-strip"><div><span>CONFIGURED CABINETS</span><strong data-testid="quote-cabinet-count">{String(scene.cabinets.length).padStart(2,'0')}</strong></div><div><span>INDIVIDUAL COMPONENTS</span><strong data-testid="quote-parts-count">{Object.values(scene.counts).reduce((a,b)=>a+b,0)}</strong></div><div><span>LOGICAL RUN LENGTH</span><strong data-testid="quote-run-length">{formatDimension(scene.dimensions.run_length,config.units)}</strong></div><div><span>{prices?'ILLUSTRATIVE ESTIMATE':'WALL FOOTPRINT'}</span><strong className="accent-text" data-testid="bom-total-quote-readout">{prices?money(q.total):`${formatDimension(scene.dimensions.footprint_width,config.units)} × ${formatDimension(scene.dimensions.footprint_depth,config.units)}`}</strong></div></div>
    <div className="quote-columns"><section className="bom-section"><div className="table-heading"><h2>Bill of materials</h2><span data-testid="bom-line-count">{q.lines.length} line items</span></div><div className="filter-tabs">{[['all','All components'],['panel','Panels'],['hardware','Hardware'],['fastener','Fasteners'],['surface','Surfaces']].map(([key,label])=><button key={key} className={filter===key?'active':''} data-testid={`bom-filter-${key}`} onClick={()=>setFilter(key)}>{label}</button>)}</div><div className="bom-table"><table data-testid="bom-table"><thead><tr><th>Component</th><th>Qty</th>{prices&&<><th>Unit</th><th>Total</th></>}</tr></thead><tbody>{lines.map(l=><tr key={l.key} data-testid={`bom-line-${l.key}`}><td><strong>{l.name}</strong><small>{l.category}</small></td><td>{l.quantity}</td>{prices&&<><td>{money(l.unit_price)}</td><td>{money(l.total)}</td></>}</tr>)}</tbody></table>{!lines.length&&<p className="empty-state" data-testid="bom-empty-state">No components in this category.</p>}</div></section>
      <aside className="quote-settings"><div className="table-heading"><h2>Quote settings</h2><Settings2 size={17}/></div><Toggle id="quote-show-prices" label="Show pricing" checked={prices} onChange={v=>setting('show_prices',v)}/><Toggle id="quote-include-hardware" label="Include hardware" checked={config.quote.include_hardware} onChange={v=>setting('include_hardware',v)}/><Toggle id="quote-include-finish" label="Include finishing" checked={config.quote.include_finish} onChange={v=>setting('include_finish',v)}/><Toggle id="quote-include-labor" label="Include assembly labor" checked={config.quote.include_labor} onChange={v=>setting('include_labor',v)}/>{config.quote.include_labor&&<label className="field-label" htmlFor="labor-rate">Hourly labor rate · USD<input id="labor-rate" data-testid="labor-rate" type="number" min="0" max="1000" value={config.quote.labor_rate} onChange={e=>setting('labor_rate',Math.min(1000,Math.max(0,Number(e.target.value))))}/></label>}
      {prices&&<div className="price-breakdown" data-testid="quote-price-breakdown"><div><span>Materials & components</span><strong>{money(q.subtotal)}</strong></div><div><span>Finishing</span><strong>{money(q.finishing)}</strong></div><div><span>Assembly labor</span><strong>{money(q.labor)}</strong></div><div className="quote-total"><span>Project estimate</span><strong>{money(q.total)}</strong></div></div>}<div className="quote-disclaimer" data-testid="pricing-disclaimer"><FileText size={18}/><p>Illustrative base-cabinet pricing only, including selected surfaces and pot racks. Not a manufacturer quote. Upper cabinets, appliances, styling items, taxes, installation and delivery are excluded.</p></div></aside></div>
  </main>;
}