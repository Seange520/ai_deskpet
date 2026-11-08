import test from 'node:test';
import assert from 'node:assert/strict';
import {createResonanceStore} from '../src/features/resonance/resonanceStore.js';
import {NODES,SYNC_EVENTS,SAVE_KEY,freshResonance,restoreResonance,grantPoints,reduceResonance,syncMultiplier,verifyDuration,confidenceFor,pointSources} from '../src/features/resonance/resonance.mjs';
import {freshCircuit,actCircuit,advanceCircuit} from '../src/features/street/circuit.mjs';
import {freshKickback,actKickback,advanceKickback} from '../src/features/street/kickback.mjs';
const grant=()=>grantPoints(freshResonance(),{level:5,street:true,kickbackFirst:true,kickbackClean:true,prisms:2});
const unlock=(s,id)=>reduceResonance(s,{type:'unlock',id});
test('initial contract',()=>{const s=freshResonance();assert.equal(s.points,0);assert.equal(s.sync,50);assert.equal(s.levelGranted,1);assert.deepEqual(s.slots,[null,null,null]);assert.equal(NODES.length,6);});
test('levels 2 to 5 grant one each and never twice',()=>{let s=freshResonance();for(let level=2;level<=5;level++){s=grantPoints(s,{level});assert.equal(s.points,level-1);assert.equal(grantPoints(s,{level}).points,s.points);}});
test('three case grants are idempotent; total economy seven',()=>{assert.equal(grant().points,7);assert.equal(grantPoints(grant(),{level:5,street:true,kickbackFirst:true,kickbackClean:true}).points,7);});
test('insufficient points cannot unlock',()=>assert.deepEqual(unlock(freshResonance(),NODES[0].id).nodes,{}));
test('unlock order free; never auto-equips',()=>{const s=unlock(grant(),'li_protocol');assert.equal(s.spent,1);assert.equal(s.points,6);assert.deepEqual(s.slots,[null,null,null]);assert.equal(unlock(s,'li_protocol').points,6);});
test('three slots reject duplicate and invalid indices',()=>{let s=grant();for(let i=0;i<4;i++)s=unlock(s,NODES[i].id);for(let i=0;i<3;i++)s=reduceResonance(s,{type:'equip',slot:i,id:NODES[i].id});const slots=s.slots;assert.deepEqual(reduceResonance(s,{type:'equip',slot:3,id:NODES[3].id}).slots,slots);assert.deepEqual(reduceResonance(s,{type:'equip',slot:1,id:NODES[0].id}).slots,slots);});
test('exploration gate rejects switch and reset',()=>{const s={...unlock(grant(),NODES[0].id),exploring:true};assert.deepEqual(reduceResonance(s,{type:'equip',slot:0,id:NODES[0].id}).slots,s.slots);assert.equal(reduceResonance(s,{type:'reset'}).resetCount,0);});
for(const [kind,delta] of Object.entries(SYNC_EVENTS))test('sync weight '+kind,()=>{const a={type:'sync',kind,key:kind,caseId:'street'};const s=reduceResonance(freshResonance(),a);assert.equal(s.sync,50+delta);assert.equal(reduceResonance(s,a).sync,s.sync);});
test('sync clamp and multiplier',()=>{assert.equal(syncMultiplier(0),.5);assert.equal(syncMultiplier(100),1);assert.equal(reduceResonance({...freshResonance(),sync:99},{type:'sync',kind:'verifyPass',key:'x'}).sync,100);assert.equal(reduceResonance({...freshResonance(),sync:1},{type:'sync',kind:'jumper',key:'x'}).sync,0);});
test('authoritative duration formula',()=>{assert.equal(verifyDuration(7,50),6.21);assert.equal(verifyDuration(7,100),5.95);});
test('reset consumes aggregated prism, refunds spent, preserves memories and snapshot',()=>{let s=grant();for(const n of NODES)s=unlock(s,n.id);const memories=s.memories;s=reduceResonance(s,{type:'reset'});assert.equal(s.points,7);assert.equal(s.spent,0);assert.equal(s.resetCount,1);assert.equal(s.availablePrisms,1);assert.equal(s.sync,50);assert.equal(s.history[0].nodes.li_protocol,true);assert.deepEqual(s.memories,memories);assert.deepEqual(s.nodes,{});assert.equal(reduceResonance(freshResonance(),{type:'reset'}).resetCount,0);});
test('both three-node memories occur once across resets',()=>{let s=grant();for(const n of NODES)s=unlock(s,n.id);assert.equal(s.memories.length,2);s=reduceResonance(s,{type:'reset'});for(const n of NODES)s=unlock(s,n.id);assert.equal(s.memories.length,2);});
test('bad JSON, missing fields and v0 migrate safely',()=>{assert.deepEqual(restoreResonance('{'),freshResonance());assert.equal(restoreResonance('{"version":0,"sync":200}').sync,100);assert.deepEqual(restoreResonance('{}').slots,[null,null,null]);});
test('sources expose seven stable display records',()=>{assert.equal(pointSources(grant()).length,7);assert.ok(pointSources(grant()).every(x=>x.id&&x.label&&x.points===1&&x.claimed));});
test('storage isolation and refresh persist; unavailable storage falls back',()=>{const map=new Map([['sparkmate.routes.v2','unchanged'],['sparkmate.seventh-checksum.street.v1','unchanged'],['sparkmate.seventh-checksum.kickback.v1','unchanged']]);const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};const store=createResonanceStore(storage);store.getState().reconcile({level:5,prisms:1});store.getState().dispatch({type:'unlock',id:NODES[0].id});store.getState().dispatch({type:'reset'});assert.equal(createResonanceStore(storage).getState().resetCount,1);for(const [k,v] of map)if(k!==SAVE_KEY)assert.equal(v,'unchanged');assert.equal(createResonanceStore(undefined).getState().storageError,true);});
test('confidence correct repeated / uncertain / rejected',()=>{assert.equal(confidenceFor('lamp','voltage',{value:24},2),'high');assert.equal(confidenceFor('lamp','voltage',{value:24},1),'medium');assert.equal(confidenceFor('K1','voltage',{status:'overflow'},2),'low');});
test('P0 optional precision waives exactly first rejected measurement',()=>{const s={...freshCircuit(),scanner:true,mode:'continuity'};const base=actCircuit(s,{type:'measure',id:'return'});assert.equal(base.focus,88);const first=actCircuit(s,{type:'measure',id:'return'},{confidence:true});assert.equal(first.focus,100);assert.equal(actCircuit(first,{type:'measure',id:'return'},{confidence:true}).focus,88);assert.deepEqual(actCircuit(s,{type:'measure',id:'return'},null),base);});
test('P0 protocol only changes optional completion window',()=>{const s={...freshCircuit(),verifying:true,returnFixed:true,softStart:true};assert.equal(advanceCircuit(s,6.21).completed,false);assert.equal(advanceCircuit(s,6.21,{protocol:true,sync:50}).completed,true);assert.equal(advanceCircuit(s,7).completed,true);});
test('P0 dodge prevents next stage exactly once',()=>{const red=actCircuit(freshCircuit(),{type:'jumper'});const d=advanceCircuit(red,.1,{dodge:true});assert.equal(d.powered,false);assert.equal(d.stage,'red');assert.equal(d.fuse,'intact');assert.equal(d.resonanceDodgeUsed,true);assert.equal(advanceCircuit(red,.1).powered,true);});
test('M1 dodge intercepts failed opening; default and protocol retain ten checks',()=>{const s={...freshKickback(),lessonPassed:true,cycleTime:.59};const d=advanceKickback(s,.02,{dodge:true});assert.equal(d.powered,false);assert.equal(d.openings,s.openings);assert.equal(d.protected,false);assert.equal(advanceKickback(s,.02).openings,s.openings+1);assert.deepEqual(advanceKickback(s,.02,{protocol:true}),advanceKickback(s,.02));});
test('M1 first wrong range waiver and optional clues',()=>{const s={...freshKickback(),lessonPassed:true,scanner:true,mode:'continuity'};assert.equal(actKickback(s,{type:'measure',id:'K1'}).focus,94);assert.equal(actKickback(s,{type:'measure',id:'K1'},{confidence:true}).focus,100);assert.ok(advanceCircuit(freshCircuit(),.1,{fastScan:true,thermal:true,night:true}).resonanceNotes.thermal);assert.equal(advanceCircuit(freshCircuit(),.1).resonanceNotes,undefined);});

import {restoreKickback} from '../src/features/street/kickback.mjs';
import {caseMetadata,restoreCaseMetadata,earnedPrisms,cleanCompletion} from '../src/features/resonance/casePersistence.mjs';
test('refresh reconciles rewards then reset survives another refresh with history',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 let store=createResonanceStore(storage);store.getState().reconcile({level:5,prisms:1});store.getState().dispatch({type:'unlock',id:'li_precision'});
 store=createResonanceStore(storage);assert.equal(store.getState().availablePrisms,0);store.getState().reconcile({prisms:1});assert.equal(store.getState().availablePrisms,1);
 store.getState().dispatch({type:'reset'});store=createResonanceStore(storage);store.getState().reconcile({prisms:1});assert.equal(store.getState().resetCount,1);assert.equal(store.getState().availablePrisms,0);assert.equal(store.getState().history[0].nodes.li_precision,true);
 assert.equal(JSON.parse(map.get(SAVE_KEY)).resonanceNotes,undefined);
});
test('forged resonance prism balance and incomplete case rewards grant no prism',()=>{
 const s=restoreResonance(JSON.stringify({...freshResonance(),availablePrisms:999,claimedPrisms:[{}]}));assert.equal(s.availablePrisms,0);
 assert.equal(earnedPrisms({completed:false,xp:120,prisms:999},restoreKickback('{"schemaVersion":1,"completed":true,"rewardClaimed":true,"verified":10}')),0);
 assert.equal(grantPoints(s,{prisms:0}).availablePrisms,0);
});
test('event keys survive reload and log eviction without a repeated delta',()=>{
 let s=reduceResonance(freshResonance(),{type:'sync',kind:'jumper',key:'street:jumper:case'});
 for(let i=0;i<60;i++)s=reduceResonance(s,{type:'sync',kind:'dialogue',key:'street:dialogue:'+i});
 s=restoreResonance(JSON.stringify(s));assert.equal(s.syncLog.length,50);assert.equal(reduceResonance(s,{type:'sync',kind:'jumper',key:'street:jumper:case'}).sync,s.sync);
});
test('case ability metadata preserves first-error waiver and confidence attempts',()=>{
 let s={...freshCircuit(),scanner:true,mode:'continuity'};s=actCircuit(s,{type:'measure',id:'return'},{confidence:true});
 const restored={...freshCircuit(),scanner:true,mode:'continuity',...restoreCaseMetadata(JSON.parse(JSON.stringify(caseMetadata(s))))};
 const next=actCircuit(restored,{type:'measure',id:'return'},{confidence:true});assert.equal(next.focus,88);assert.equal(next.resonanceAttempts['return:continuity'],2);
});
test('clean completion requires historical no-fuse no-penalty outcome',()=>{
 const s={completed:true,meterFuse:'intact',penalty:0,evidence:Object.fromEntries(Array.from({length:6},(_,i)=>[i,{}]))};assert.equal(cleanCompletion(s),true);assert.equal(cleanCompletion({...s,penalty:1}),false);assert.equal(cleanCompletion({...s,meterFuse:'open'}),false);
});

test('legacy v1 log keys migrate before the bounded log rolls over',()=>{let s=restoreResonance(JSON.stringify({version:1,syncLog:[{key:'street:jumper:case'}]}));for(let i=0;i<51;i++)s=reduceResonance(s,{type:'sync',kind:'dialogue',key:'legacy:'+i});const sync=s.sync;s=restoreResonance(JSON.stringify(s));assert.equal(reduceResonance(s,{type:'sync',kind:'jumper',key:'street:jumper:case'}).sync,sync);});
