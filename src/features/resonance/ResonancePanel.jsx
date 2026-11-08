import { useEffect, useState } from 'react';
import { GitBranch, Sparkles } from 'lucide-react';
import { NODES, pointSources } from './resonance.mjs';
import { useResonance } from './resonanceStore.js';
import { subscribeResonanceSync } from './resonanceBridge.mjs';
import './resonance.css';
export default function ResonancePanel(){
 const s=useResonance(),[confirm,setConfirm]=useState(false),[slot,setSlot]=useState(0);
 useEffect(subscribeResonanceSync,[]);
 return <div className="resonance-panel" data-resonance-panel>
 <GitBranch size={28}/><h2 id="modal-title">共鸣链</h2><small>与你同步的那部分零</small>
 <p>共鸣点 <b data-resonance-points>{s.points}</b> · 已投入 {s.spent} · 棱镜 {s.availablePrisms}</p>
 <label>同步率 {s.sync}<meter min="0" max="100" value={s.sync}/></label>
 <div className="resonance-slots">{s.slots.map((id,i)=><button key={i} data-resonance-slot={i} aria-label={'主动槽位 '+(i+1)} aria-pressed={slot===i} onClick={()=>setSlot(i)}>主动槽位 {i+1} · {NODES.find(n=>n.id===id)?.name||'空'}</button>)}<button data-resonance-clear aria-label="卸下选中共鸣槽" onClick={()=>s.dispatch({type:'equip',slot,id:null})}>卸下</button></div>
 <div className="resonance-chains">{['li','gan'].map(chain=><section key={chain}><h3>{chain==='li'?'理之链':'感之链'}</h3>{NODES.filter(n=>n.chain===chain).map(n=>{const owned=s.nodes[n.id],equipped=s.slots.includes(n.id);return <article key={n.id} data-resonance-node={n.id} data-state={equipped?'equipped':owned?'unlocked':s.points?'available':'locked'}><h4><Sparkles size={15}/>{n.name} <small>{equipped?'已装备':owned?'已解锁':s.points?'可解锁':'未解锁'}</small></h4><p>{n.desc}</p><button data-resonance-unlock={n.id} aria-label={'解锁共鸣'+n.name} disabled={owned||!s.points} onClick={()=>s.dispatch({type:'unlock',id:n.id})}>解锁 · 1 点</button><button data-resonance-equip={n.id} aria-label={'装备共鸣'+n.name} disabled={!owned||equipped} onClick={()=>s.dispatch({type:'equip',id:n.id,slot})}>装备到槽位 {slot+1}</button></article>;})}</section>)}</div>
 <p role="status">{s.message}{s.storageError?' 存档不可写（仅本次会话有效）':''}</p>
 <details data-resonance-sources><summary>共鸣点来源</summary>{pointSources(s).map(x=><p key={x.id}>{x.label} +{x.points} · {x.claimed?'已领取':'待完成'}</p>)}</details>
 <details open data-resonance-log><summary>同步记录</summary>{s.syncLog.slice(-10).map((e,i)=><p key={i}>{e.caseId} · {e.reason} {e.delta>0?'+':''}{e.delta}</p>)}</details>
 <details data-resonance-memories><summary>记忆碎片 · {s.memories.length}</summary>{s.memories.map(m=><p key={m.id}>{m.text}{m.summary&&<small>{m.summary}</small>}</p>)}</details>
 <button data-resonance-reset aria-label="重置共鸣链" onClick={()=>setConfirm(true)}>重置共鸣链（消耗 1 枚记忆棱镜）</button>
 {confirm&&<div role="group" aria-label="共鸣重置确认"><p>返还已用点数，保留记忆；消耗一枚棱镜。</p><button data-resonance-confirm aria-label="确认重置共鸣链" onClick={()=>{s.dispatch({type:'reset'});setConfirm(false);}}>确认重置</button><button data-resonance-cancel aria-label="取消重置共鸣链" onClick={()=>setConfirm(false)}>取消</button></div>}
 <details open={s.history.length>0||undefined} data-resonance-history><summary>曾经的选择 · {s.resetCount}</summary>{s.history.map((h,i)=><p key={i}>{new Date(h.t).toLocaleString()} · {Object.keys(h.nodes).length} 节点 · 同步 {h.sync}</p>)}</details>
 </div>;
}
