// The contract is small and it is the whole point: a panel can be put away, the
// pill that replaces it can bring it back, and both controls say what they do.
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {PanelDismiss,PanelPill,usePanel} from './Panels';

function Harness(){
  const panel=usePanel();
  return panel.open
    ? <div data-testid="panel"><PanelDismiss label="the camera dock" testId="panel-dismiss" onDismiss={panel.dismiss}/><span>controls</span></div>
    : <div data-testid="panel-collapsed"><PanelPill label="the camera dock" text="Camera" testId="panel-expand" onRestore={panel.restore}/></div>;
}

function render(node=<Harness/>){
  const container=document.createElement('div');
  document.body.appendChild(container);
  const root=createRoot(container);
  act(()=>root.render(node));
  return container;
}

const byTestId=(c,id)=>c.querySelector(`[data-testid="${id}"]`);

beforeAll(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;});

describe('a floating panel', () => {
  it('opens with its content and a dismiss control', () => {
    const c=render();
    expect(byTestId(c,'panel')).not.toBeNull();
    expect(byTestId(c,'panel-dismiss')).not.toBeNull();
    expect(byTestId(c,'panel-collapsed')).toBeNull();
  });

  it('is fully described for anyone not looking at the icon', () => {
    const c=render();
    const dismiss=byTestId(c,'panel-dismiss');
    expect(dismiss.getAttribute('aria-label')).toBe('Hide the camera dock');
    expect(dismiss.getAttribute('aria-expanded')).toBe('true');
  });

  it('leaves a labelled pill behind, and comes back from it', () => {
    const c=render();
    act(()=>byTestId(c,'panel-dismiss').click());
    expect(byTestId(c,'panel')).toBeNull();
    expect(byTestId(c,'panel-dismiss')).toBeNull();

    const pill=byTestId(c,'panel-expand');
    expect(pill).not.toBeNull();
    expect(pill.textContent).toContain('Camera');
    expect(pill.getAttribute('aria-expanded')).toBe('false');
    // The two controls for one panel name it the same way.
    expect(pill.getAttribute('aria-label')).toBe('Show the camera dock');

    act(()=>pill.click());
    expect(byTestId(c,'panel')).not.toBeNull();
    expect(byTestId(c,'panel-expand')).toBeNull();
  });

  it('carries the caller placement class, so each panel keeps its own corner', () => {
    const c=render(<PanelDismiss label="the dock" testId="d" onDismiss={()=>{}} className="dock-close"/>);
    expect(byTestId(c,'d').className).toContain('panel-dismiss');
    expect(byTestId(c,'d').className).toContain('dock-close');
  });
});
