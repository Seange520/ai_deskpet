// Pure resonance contracts; no access to teaching or case persistence.
export const SAVE_KEY = 'sparkmate.seventh-checksum.resonance.v1';
export const SYNC_EVENTS = Object.freeze({ correctMeasure:2, wrongRange:-3, correctDiagnose:3, wrongDiagnose:-2, correctRepair:4, jumper:-10, verifyPass:5, dialogue:1, verifyAbort:-3 });
export const NODES = Object.freeze([
 ['li_fast_scan','li','快速扫描','fastScan','进入案件时，先浮出一条线索。直觉不是猜，是训练过的第一眼。'],
 ['li_precision','li','误差修正','confidence','读数旁标注置信度；知道哪次读数值得写进证据。'],
 ['li_protocol','li','协议优化','protocol','校验窗口缩短到 6.21 秒（同步率 50）/ 5.95 秒（100）。'],
 ['gan_embrace','gan','记忆拥抱','embrace','结案后多留一段零的记忆；它记得的不是数据，是你当时的犹豫。'],
 ['gan_dodge','gan','直觉闪避','dodge','每案件一次，在故障推进前替你切断并提示。'],
 ['gan_thermal','gan','体温共享','thermal','靠近案件时，浮出环境异常提示（热、冷、湿度）。'],
].map(([id,chain,name,kind,desc])=>Object.freeze({id,chain,name,cost:1,prototype:true,effect:{kind},desc})));
const clamp = (n,a=0,b=100)=>Math.min(b,Math.max(a,Number(n)||0));
export const syncMultiplier = sync => 0.5+clamp(sync)/200;
export const verifyDuration = (baseSeconds,sync)=>Math.round((baseSeconds-1.05*syncMultiplier(sync))*100)/100;
export function confidenceFor(probe,mode,reading,attempts=1) {
 if (!probe || !reading || ['blocked','overflow','fuse'].includes(reading.status) || /禁止/.test(String(reading.value))) return 'low';
 return attempts>1 && (reading.mode===undefined || reading.mode===mode) ? 'high' : 'medium';
}
export function freshResonance(){ return {version:1,points:0,spent:0,nodes:{},slots:[null,null,null],sync:50,syncLog:[],memories:[],history:[],resetCount:0,availablePrisms:0,resonanceNotes:{},syncKeys:[],levelGranted:1,caseGrants:{street:false,kickbackFirst:false,kickbackClean:false},claimedPrisms:[],updatedAt:0}; }
export function restoreResonance(raw){
 let d; try {d=JSON.parse(raw);}catch{return freshResonance();}
 if(!d || typeof d!=='object' || d.version>1) return freshResonance();
 const s=freshResonance();
 for(const k of ['points','spent','resetCount','updatedAt']) s[k]=Math.max(0,Math.floor(Number(d[k])||0));
 s.levelGranted=clamp(d.levelGranted||1,1,5); s.sync=clamp((d.sync === undefined ? 50 : d.sync));
 for(const n of NODES) if(d.nodes?.[n.id]===true) s.nodes[n.id]=true;
 const used=new Set();s.slots=s.slots.map((_,i)=>{const id=d.slots?.[i];if(!s.nodes[id]||used.has(id)) return null;used.add(id);return id;});
 s.syncKeys=Array.isArray(d.syncKeys)?[...new Set(d.syncKeys.filter(k=>typeof k==='string'))]:[];
 for(const k of ['syncLog','memories','history','claimedPrisms']) if(Array.isArray(d[k])) s[k]=d[k].filter(x=>x && typeof x==='object').slice(- (k==='syncLog'?50:500));
 for(const k of Object.keys(s.caseGrants)) s.caseGrants[k]=d.caseGrants?.[k]===true;
 s.syncKeys=[...new Set([...s.syncKeys,...s.syncLog.map(e=>e.key).filter(k=>typeof k==='string')])];
 return s;
}
export function pointSources(s){return [...[2,3,4,5].map(l=>({id:'level'+l,label:'LV'+l,points:1,claimed:s.levelGranted>=l})),...Object.keys(freshResonance().caseGrants).map(id=>({id,label:({street:'路灯完成',kickbackFirst:'冷库首次完成',kickbackClean:'冷库全证据无熔断'})[id],points:1,claimed:s.caseGrants[id]}))];}
export function grantPoints(s,{level=1,street=false,kickbackFirst=false,kickbackClean=false,prisms=0}={}){
 const nextLevel=Math.max(s.levelGranted,clamp(level,1,5)); let gained=nextLevel-s.levelGranted; const caseGrants={...s.caseGrants};
 for(const [k,v] of Object.entries({street,kickbackFirst,kickbackClean})) if(v&&!caseGrants[k]) {gained++;caseGrants[k]=true;}
 return {...s,points:s.points+gained,levelGranted:nextLevel,caseGrants,availablePrisms:Math.max(0,prisms-s.resetCount)};
}
export function reduceResonance(s,a){
 const reject=message=>({...s,message});
 if(a.type==='unlock'){
 const n=NODES.find(n=>n.id===a.id);if(!n||s.nodes[a.id]||s.points<n.cost)return reject('点数不足');
 const nodes={...s.nodes,[a.id]:true};const memories=[...s.memories];
 if(NODES.filter(x=>x.chain===n.chain).every(x=>nodes[x.id])&&!memories.some(m=>m.id==='chain:'+n.chain))memories.push({id:'chain:'+n.chain,source:n.chain,t:Date.now(),text:n.chain==='li'?'你忽然确定，自己不是第一次把一根线接到这里。':'有个声音在很远的地方说：别怕，这次我在。'});
 return {...s,nodes,memories,points:s.points-1,spent:s.spent+1,message:'节点已解锁，请显式装备。'};
 }
 if(a.type==='equip'){
 if(s.exploring)return reject('探索中不能更换共鸣链槽位');
 if(!Number.isInteger(a.slot)||a.slot<0||a.slot>2|| (a.id&&(!s.nodes[a.id]||s.slots.includes(a.id))))return reject('槽位无效或节点已装备。');
 const slots=[...s.slots];slots[a.slot]=a.id||null;return {...s,slots,message:'装备已更新。'};
 }
 if(a.type==='sync'){
 const delta=SYNC_EVENTS[a.kind]; if(delta===undefined||!a.key||s.syncKeys.includes(a.key)||s.syncLog.some(e=>e.key===a.key))return s;
 return {...s,sync:clamp(s.sync+delta),syncKeys:[...s.syncKeys,a.key],syncLog:[...s.syncLog,{t:Date.now(),key:a.key,caseId:a.caseId,reason:a.kind,delta}].slice(-50)};
 }
 if(a.type==='reset'){
 if(s.exploring)return reject('请返回主界面后重置。');
 if(!(s.availablePrisms>0))return reject('需要 1 枚记忆棱镜才能重置');
 return {...s,points:s.points+s.spent,spent:0,nodes:{},slots:[null,null,null],sync:50,resetCount:s.resetCount+1,availablePrisms:s.availablePrisms-1,history:[...s.history,{t:Date.now(),nodes:s.nodes,slots:s.slots,sync:s.sync}],message:'已重置共鸣链，旧配置已记入「曾经的选择」'};
 }
 return s;
}
// Optional case adapters. With no modifiers the original state is returned unchanged.
export function caseClues(s,mods,caseId){
 if(!mods)return s;
 let n=s;const notes={...s.resonanceNotes};
 if(mods.fastScan&&!notes.scan)notes.scan=caseId==='street'?'灯光明暗与设备启动存在周期关系。':'开关响过之后，屏幕才出现变化。';
 if(mods.thermal&&mods.night&&!notes.thermal)notes.thermal='墙那边的夜里，比这边更冷一点。';
 if(Object.keys(notes).length!==Object.keys(s.resonanceNotes||{}).length)n={...n,resonanceNotes:notes};return n;
}
export function adaptAction(before,next,action,mods){
 if(!mods)return next;
 if(action.type==='diagnose'&&next.message!==before.message&&next.diagnosed===before.diagnosed&&JSON.stringify(next.diagnoses)===JSON.stringify(before.diagnoses))next={...next,message:'这次判断和证据对不上，再看看。'};
 if(mods.confidence&&action.type==='measure'&&next.reading!==before.reading&&next.reading){
 const key=action.id+':'+before.mode;next={...next,resonanceAttempts:{...before.resonanceAttempts,[key]:(before.resonanceAttempts?.[key]||0)+1}};
 const wrong=['blocked','overflow','fuse'].includes(next.reading.status)||/禁止/.test(String(next.reading.value));
 if(wrong&&!before.resonancePrecisionUsed)return {...next,focus:before.focus,resonancePrecisionUsed:true};
 }
 return next;
}
export function dodgeFault(s,mods){return mods?.dodge&&!s.resonanceDodgeUsed?{...s,powered:false,verifying:false,resonanceDodgeUsed:true,message:'零的手比警报快'}:null;}
