import {create} from 'zustand';
import {ASSEMBLY_SAVE,restoreAssembly,completeAssembly,lessonBinding} from './assembly.mjs';
function read(){try{return restoreAssembly(localStorage.getItem(ASSEMBLY_SAVE));}catch{return restoreAssembly(null);}}
export const useAssembly=create((set,get)=>{
 const persist=save=>{let storageError=false;try{localStorage.setItem(ASSEMBLY_SAVE,JSON.stringify(save));}catch{storageError=true;}set({save,storageError});};
 return {save:read(),storageError:false,
 complete:(s,preflight,seconds)=>{const old=get().save,next=completeAssembly(old,s,preflight,seconds,Date.now());if(next!==old)persist(next);},
 fail:issue=>{if(lessonBinding[issue])persist({...get().save,failures:[...get().save.failures,{issue,lesson:lessonBinding[issue]}].slice(-50),updatedAt:Date.now()});},
 consume:()=>persist({...get().save,consumed:{extinguishers:get().save.consumed.extinguishers+1},updatedAt:Date.now()}),
 };
});
