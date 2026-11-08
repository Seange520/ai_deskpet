import { create } from 'zustand';
import { SAVE_KEY, freshResonance, restoreResonance, reduceResonance, grantPoints } from './resonance.mjs';
export function createResonanceStore(storage){
 let initial=freshResonance(),storageError=false;
 try{initial=restoreResonance(storage.getItem(SAVE_KEY));}catch{storageError=true;}
 return create((set,get)=>{
 // resonanceNotes are session-only clues and are deliberately excluded from saves.
 const persist=next=>{const data=Object.fromEntries(Object.keys(freshResonance()).filter(k=>k!=='resonanceNotes').map(k=>[k,next[k]]));data.updatedAt=Date.now();try{storage.setItem(SAVE_KEY,JSON.stringify(data));}catch{next.storageError=true;}set({...next,updatedAt:data.updatedAt});};
 return {...initial,storageError,availablePrisms:0,exploring:false,message:'',
 dispatch:a=>persist(reduceResonance(get(),a)),
 reconcile:sources=>persist(grantPoints(get(),sources)),
 setExplorationMode:exploring=>set({exploring}),
 remember:memory=>{if(!get().memories.some(m=>m.id===memory.id))persist({...get(),memories:[...get().memories,memory]});},
 };
 });
}
let storage;try{storage=globalThis.localStorage;}catch{/* memory fallback */}
export const useResonance=createResonanceStore(storage);
