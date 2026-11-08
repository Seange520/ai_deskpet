import { useEffect } from 'react';
import { NODES } from './resonance.mjs';
import { useResonance } from './resonanceStore.js';
import { subscribeResonanceSync, abortResonanceVerification } from './resonanceBridge.mjs';
import './resonance.css';
export default function ResonanceHud(){
 const s=useResonance();
 useEffect(()=>{useResonance.getState().setExplorationMode(true);const off=subscribeResonanceSync();return ()=>{abortResonanceVerification();off();useResonance.getState().setExplorationMode(false);};},[]);
 return <aside className="resonance-hud" data-resonance-hud style={{pointerEvents:'none'}} aria-label="探索共鸣状态"><div>{s.slots.map((id,i)=><span key={i}>主动槽位 {i+1}: {NODES.find(n=>n.id===id)?.name||'空槽'}</span>)}</div><label>同步率 {s.sync}<meter min="0" max="100" value={s.sync}/></label></aside>;
}
