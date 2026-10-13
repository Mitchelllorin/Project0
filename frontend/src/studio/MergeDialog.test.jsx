// A merge is not a label any more: the joint gables come out, a shared partition
// goes in, one carcass stops being assembled and the price moves. So the dialog
// has to say what a merge would do BEFORE it does it — and the copy that used to
// claim "every child part stays intact" is exactly the sentence this guards.
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import axios from 'axios';

const mockStudio={
  config:{units:'mm',groups:[]},
  update:jest.fn(),
  setSelected:jest.fn(),
  selected:[],
  scene:{cabinets:[
    {id:'B01',name:'Drawer base',width:762},
    {id:'B02',name:'Sink base',width:914.4},
  ]},
};

jest.mock('axios',()=>({post:jest.fn()}));
jest.mock('./StudioContext',()=>({API:'http://api.test/api',useStudio:()=>mockStudio}));

import {MergeDialog} from './MergeDialog';

// Radix renders the dialog into a portal on document.body, not into the container.
const byTestId=id=>document.querySelector(`[data-testid="${id}"]`);
const flush=()=>new Promise(r=>setTimeout(r,0));
// A merge needs two cabinets before it means anything.
const tickBoth=()=>{act(()=>byTestId('merge-select-B01').click());act(()=>byTestId('merge-select-B02').click());};

function render(node){
  const container=document.createElement('div');
  document.body.appendChild(container);
  const root=createRoot(container);
  act(()=>root.render(node));
  return container;
}

beforeAll(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
beforeEach(()=>{
  axios.post.mockReset();
  mockStudio.update.mockReset();
  document.body.innerHTML='';
});

// Radix's dialog measures and pointer-captures; jsdom does neither.
beforeAll(()=>{
  Element.prototype.hasPointerCapture=()=>false;
  Element.prototype.setPointerCapture=()=>{};
  Element.prototype.releasePointerCapture=()=>{};
  window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
});

const FUSED={
  run_length:1676.4, geometry_fused:true, shared_gable_allowance:1, carcasses_saved:1, saving:201.23,
  runs:[{ids:['B01','B02'],fused:true,joints:1}],
};

describe('what the merge panel promises', () => {
  it('never claims every part survives, because the joint gables do not', () => {
    render(<MergeDialog open onOpenChange={()=>{}}/>);
    const copy=byTestId('merge-dialog-description').textContent;
    expect(copy).not.toMatch(/every child part stays intact/i);
    expect(copy).toMatch(/gables at the joint are shared/i);
  });

  it('says what the run will cost before the buttons are pressed', async () => {
    axios.post.mockResolvedValue({data:FUSED});
    render(<MergeDialog open onOpenChange={()=>{}}/>);
    tickBoth();
    await act(async()=>{await new Promise(r=>setTimeout(r,400));});
    const effect=byTestId('merge-effect');
    expect(effect).not.toBeNull();
    expect(effect.textContent).toMatch(/1 joint gable removed/);
    expect(effect.textContent).toMatch(/\$201\.23 off this run/);
  });

  it('explains a refusal instead of silently merging nothing', async () => {
    axios.post.mockResolvedValue({data:{run_length:1000,geometry_fused:false,carcasses_saved:0,saving:0,runs:[{ids:['B01','B02'],fused:false,reason:'a corner cabinet has no gable to share'}]}});
    render(<MergeDialog open onOpenChange={()=>{}}/>);
    tickBoth();
    await act(async()=>{await new Promise(r=>setTimeout(r,400));});
    expect(byTestId('merge-effect').textContent).toMatch(/no gable to share/);
  });

  it('does not ask the server anything until two cabinets are ticked', async () => {
    render(<MergeDialog open onOpenChange={()=>{}}/>);
    await act(async()=>{await new Promise(r=>setTimeout(r,400));});
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('records the merged run against the configuration', async () => {
    axios.post.mockResolvedValue({data:FUSED});
    render(<MergeDialog open onOpenChange={()=>{}}/>);
    tickBoth();
    await act(async()=>{byTestId('confirm-merge-button').click();await flush();});
    expect(mockStudio.update).toHaveBeenCalledWith({groups:[['B01','B02']]});
  });
});
