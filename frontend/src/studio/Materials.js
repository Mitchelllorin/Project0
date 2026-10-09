import * as THREE from 'three';

let seed=24;
function random(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
const cache={};
export function woodTexture(dark=false) {
  const key=dark?'walnut':'oak';if(cache[key])return cache[key];
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle=dark?'#68503c':'#c5aa80';ctx.fillRect(0,0,256,512);
  seed=42;
  for(let i=0;i<850;i++){
    const x=random()*256;
    ctx.strokeStyle=dark?`rgba(26,13,6,${random()*.23})`:`rgba(95,61,26,${random()*.18})`;
    ctx.lineWidth=.3+random()*1.4;ctx.beginPath();ctx.moveTo(x,0);
    ctx.bezierCurveTo(x+Math.sin(x)*5,160,x+Math.cos(x)*9,350,x+3,512);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
  cache[key]=texture;return texture;
}
export function marbleTexture() {
  if(cache.marble)return cache.marble;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f0efeb';ctx.fillRect(0,0,512,512);seed=12;
  for(let i=0;i<32;i++){
    const x=random()*640-90;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+140,150,x-40,270,x+250,512);ctx.lineWidth=random()*2+.3;ctx.strokeStyle=`rgba(119,125,121,${random()*.16})`;ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;cache.marble=texture;return texture;
}
export const finishColors={oak:'#e4d1b2',walnut:'#a4896e',sage:'#788576',ivory:'#e4e1d6',charcoal:'#393d3b'};
export function surfaceProps(config) {
  return {color:config.countertop==='calacatta'?'#ffffff':config.countertop==='noir'?'#303432':'#a6a7a2',map:config.countertop==='calacatta'?marbleTexture():null,roughness:config.surface==='polished'?.17:.65,metalness:.08};
}
export function panelProps(config,material) {
  if(material==='surface')return surfaceProps(config);
  if(material==='steel')return {color:'#aeb8b8',metalness:.82,roughness:.26};
  if(material==='hardware')return {color:{brass:'#bda06e',black:'#252827',steel:'#bdc5c3'}[config.hardware],metalness:.8,roughness:.24};
  if(material==='finish')return {color:finishColors[config.finish],map:['oak','walnut'].includes(config.finish)?woodTexture(config.finish==='walnut'):null,roughness:.52};
  return {color:'#e3d2b4',map:woodTexture(),roughness:.65};
}