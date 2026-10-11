// Dealer accounts, in two places: a badge in the header that is the way in, and the
// trade pricing block on the quote page that is the reason to sign in.
//
// The trade discount and the dealer's cost are shown here and on no printable document.
// The customer's copy is list pricing less whatever discount the dealer chooses to give,
// which is the only number a homeowner is ever meant to see.
import React,{useState} from 'react';
import {KeyRound,LogOut,BadgeCheck} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {useStudio} from './StudioContext';
import {money} from './engine';
import {percent} from './dealer';

export function DealerBadge(){
  const {dealer,signInDealer,signOutDealer,dealerBusy}=useStudio();
  const [open,setOpen]=useState(false),[code,setCode]=useState(''),[problem,setProblem]=useState('');
  const submit=async()=>{
    const error=await signInDealer(code);
    if(error){setProblem(error);return;}
    setProblem('');setCode('');setOpen(false);
  };
  return <>
    <button className={`dealer-badge ${dealer?'signed-in':''}`} data-testid="dealer-badge" onClick={()=>{setProblem('');setOpen(true);}}>
      {dealer?<BadgeCheck size={13}/>:<KeyRound size={13}/>}
      <span data-testid="dealer-badge-label">{dealer?dealer.name:'Dealer sign-in'}</span>
      {dealer&&<small data-testid="dealer-badge-tier">{dealer.tier_name}</small>}
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="studio-dialog" data-testid="dealer-dialog">
      {dealer?
        <><DialogTitle data-testid="dealer-dialog-title">{dealer.name}</DialogTitle>
          <DialogDescription>{dealer.tier_name} pricing{dealer.region?` · ${dealer.region}`:''}. This browser is signed in; a shared link is not.</DialogDescription>
          <p className="dealer-terms" data-testid="dealer-terms">Your account buys materials, components and surfaces at <strong>{percent(dealer.discount)}</strong> off list. Everything you quote is priced from that on the server, so the figures in the studio are the figures you are billed on.</p>
          <Button className="ghost-button" data-testid="dealer-sign-out" onClick={()=>{signOutDealer();setOpen(false);}}><LogOut size={14}/>Sign out</Button></>
        :<><DialogTitle data-testid="dealer-dialog-title">Dealer sign-in</DialogTitle>
          <DialogDescription>Enter the access code your manufacturer gave you. Pricing then follows your account's trade tier — on the server, for this browser only.</DialogDescription>
          <label className="field-label" htmlFor="dealer-code">Access code<input id="dealer-code" data-testid="dealer-code" type="password" autoComplete="off" spellCheck="false" value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();}}/></label>
          {problem&&<p className="error-message" data-testid="dealer-error" role="alert">{problem}</p>}
          <Button className="accent-button" data-testid="dealer-submit" onClick={submit} disabled={dealerBusy}>{dealerBusy?'Checking…':'Sign in'}</Button></>}
    </DialogContent></Dialog>
  </>;
}

export function DealerPricing(){
  const {dealer,scene,config,update}=useStudio();
  const quote=scene&&scene.quote,tier=quote&&quote.price_tier;
  if(!dealer||!tier)return null;
  const resale=config.quote.resale_discount||0;
  const setResale=value=>update({quote:{...config.quote,resale_discount:Math.min(.9,Math.max(0,Number(value)/100))}});
  return <section className="dealer-pricing" data-testid="dealer-pricing">
    <div className="table-heading"><h2>Dealer pricing</h2><span data-testid="dealer-tier-label">{dealer.tier_name} · {percent(tier.discount)}</span></div>
    <div className="price-breakdown">
      <div><span>List, goods &amp; surfaces</span><strong data-testid="dealer-list-total">{money(tier.list_total,2)}</strong></div>
      <div><span>Less trade discount</span><strong data-testid="dealer-trade-discount">−{percent(tier.discount)}</strong></div>
      <div><span>Your cost from the factory</span><strong data-testid="dealer-cost-total">{money(tier.cost_total,2)}</strong></div>
      <div><span>Price to your client</span><strong data-testid="dealer-client-total">{money(tier.client_total,2)}</strong></div>
      <div className="quote-total"><span>Your margin</span><strong data-testid="dealer-margin">{money(tier.margin,2)}</strong></div>
      <span className="dealer-margin-note" data-testid="dealer-margin-percent">{percent(tier.margin_pct,1)} of the client price</span>
    </div>
    <label className="field-label" htmlFor="resale-discount">Discount to your client · %<input id="resale-discount" data-testid="resale-discount" type="number" min="0" max="90" value={Math.round(resale*100)} onChange={e=>setResale(e.target.value)}/></label>
    <p className="dealer-note" data-testid="dealer-note">Deducted from list, not from your cost — drop the client price far enough and the margin goes negative, which is worth seeing before you send it. Your cost and margin appear here and on no printable document.</p>
  </section>;
}
