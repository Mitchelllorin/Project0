// Floating panels over the model.
//
// Everything that floats over the 3D view sits in front of whatever you are
// trying to look at, work on or move. So every one of them carries its own
// dismiss control, and dismissing one leaves a labelled pill in its place —
// which means there is always a way out of a panel, and always a way back in.
// A panel you can hide but cannot recover is worse than one you cannot hide.
//
// The parts are deliberately separate rather than one wrapper element, because
// where the dismiss control belongs differs per panel: inside the caption's
// eyebrow line, at the top of the tool column, at the end of the camera dock,
// after Done in the layout bar. A single absolutely-positioned overlay would
// land on top of, or be clipped by, the panel it is meant to get out of the way.
//
// Dismissal is session-only. A stored preference would let someone put every
// panel away, come back next week and find no controls, no memory of having
// asked for that, and no caption explaining where they went.
import React,{useState} from 'react';
import {X} from 'lucide-react';

export function usePanel(defaultOpen = true){
  const [open,setOpen]=useState(defaultOpen);
  return {open,dismiss:()=>setOpen(false),restore:()=>setOpen(true)};
}

// The way out. `className` places it in whatever row the panel is built from.
export function PanelDismiss({label,onDismiss,testId,className=''}){
  return <button type="button" className={`panel-dismiss ${className}`} data-testid={testId}
    title={`Hide ${label}`} aria-label={`Hide ${label}`} aria-expanded="true" onClick={onDismiss}><X size={13}/></button>;
}

// The way back. Sits where the panel was, in the panel's own container, so it
// inherits that panel's corner and its responsive position for free.
//
// `label` is the accessible name and takes the same noun as the dismiss that took
// the panel away — "Hide the camera dock" and "Show the camera dock", never two
// different names for one panel. `text` is what is printed on the pill, which can
// be shorter than the name it announces.
export function PanelPill({label,text,icon,onRestore,testId,className=''}){
  return <button type="button" className={`panel-pill ${className}`} data-testid={testId}
    title={`Show ${label}`} aria-label={`Show ${label}`} aria-expanded="false" onClick={onRestore}>{icon}<span>{text||label}</span></button>;
}
