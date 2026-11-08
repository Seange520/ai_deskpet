import { useResonance } from './resonanceStore.js';
import { earnedPrisms } from './casePersistence.mjs';
import { NODES } from './resonance.mjs';
import { useStreet } from '../street/streetStore.js';
import { useKickback } from '../street/kickbackStore.js';
import { useLearningStore, totalXP, levelFor } from '../../stores/useLearningStore.js';
let users=0,cleanup;
export function emitSyncEvent(kind,meta={}){if(meta.readOnly===true){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('sparkmate:sync-event',{detail:{kind,...meta}}));return;}useResonance.getState().dispatch({type:'sync',kind,...meta,key:meta.key||`${meta.caseId}:${kind}:${meta.evidenceId||'case'}`});}
export function abortResonanceVerification(){
 for(const [store,caseId] of [[useStreet,'street'],[useKickback,'kickback']])if(store.getState().verifying){emitSyncEvent('verifyAbort',{caseId});store.setState({verifying:false});}
}
export function subscribeResonanceSync(){
 if(users++===0){
 const reconcile=()=>{const l=useLearningStore.getState(),s=useStreet.getState(),k=useKickback.getState();useResonance.getState().reconcile({level:levelFor(totalXP(l.routes,l.debugProgress)),street:s.completed,kickbackFirst:k.completed,kickbackClean:k.completed&&k.completionHistory?.some(h=>h.clean===true),prisms:earnedPrisms(s,k)});};
 const push=()=>{const r=useResonance.getState();const mods={sync:r.sync,night:true};for(const n of NODES)if(r.slots.includes(n.id))mods[n.effect.kind]=true;const active=r.slots.some(Boolean)?mods:null;useStreet.getState().setModifiers(active);useKickback.getState().setModifiers(active);};
 const watch=(store,caseId)=>store.subscribe((n,b)=>{
 if(n.reading!==b.reading&&n.reading){
 const r=n.reading;const bad=['blocked','overflow','fuse'].includes(r.status)||/禁止/.test(String(r.value));
 if(bad)emitSyncEvent('wrongRange',{caseId,evidenceId:r.node+':'+n.mode+':'+(n.range||'default')});
 for(const key of Object.keys(n.evidence))if(!b.evidence[key])emitSyncEvent('correctMeasure',{caseId,key:caseId+':measure:'+key});
 }
 const bd=(b.diagnoses ? b.diagnoses.length : Number(b.diagnosed)),nd=(n.diagnoses ? n.diagnoses.length : Number(n.diagnosed));
 if(nd>bd)for(const id of n.diagnoses ? n.diagnoses.filter(id=>!b.diagnoses.includes(id)) : ['back-emf'])emitSyncEvent('correctDiagnose',{caseId,key:caseId+':diagnose:'+id});
 if(n.message!==b.message&&/这次判断和证据对不上，再看看。|证据不足|不能支持这个诊断|还需假设记录和六类有效测量/.test(n.message))emitSyncEvent('wrongDiagnose',{caseId});
 for(const field of caseId==='street'?['returnFixed','softStart']:['repair'])if(n[field]!==b[field]&&n[field]&&n[field]!=='none')emitSyncEvent('correctRepair',{caseId,key:caseId+':repair:'+field});
 if(n.stage==='red'&&b.stage!=='red')emitSyncEvent('jumper',{caseId});
 if(b.verifying&&!n.verifying&&!n.completed)emitSyncEvent('verifyAbort',{caseId});
 if(n.completed&&!b.completed){emitSyncEvent('verifyPass',{caseId,key:caseId+':verify'});if(useResonance.getState().slots.includes('gan_embrace'))useResonance.getState().remember({id:'embrace:'+caseId,source:'gan_embrace',caseId,t:Date.now(),text:'零没有评价你，只是把这段路记了下来。',summary:`记忆拥抱 / ${Object.keys(n.evidence).length} 项证据 / ${useResonance.getState().sync}`});reconcile();}
 if(n.prisms!==b.prisms)reconcile();
 if(n.dialogue!==b.dialogue&&n.dialogue)emitSyncEvent('dialogue',{caseId,key:caseId+':dialogue:'+String(n.dialogue)});
 });
 const off=[watch(useStreet,'street'),watch(useKickback,'kickback'),useLearningStore.subscribe(reconcile),useResonance.subscribe((n,b)=>{if(n.sync!==b.sync||n.slots!==b.slots)push();})];
 reconcile();push();cleanup=()=>{off.forEach(f=>f());useStreet.getState().setModifiers(null);useKickback.getState().setModifiers(null);};
 }
 let closed=false;return ()=>{if(!closed){closed=true;if(--users===0)cleanup();}};
}
