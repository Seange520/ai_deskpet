// Pure deterministic teaching model. All time is supplied by the caller.
export const ASSEMBLY_SAVE='sparkmate.seventh-checksum.assembly.v1';
export const CONNECTIONS={jumper:{name:'杜邦线',resistance:0.05,removable:true,agingResistance:0.05},solder:{name:'焊接',resistance:0.005,removable:false,poorQualityResistance:0.05},glue:{name:'胶合绝缘',resistance:0.002,removable:false,coolingFactor:0.8}};
export const MODULES={power24:{voltage:24,current:3},buck5:{input:24,voltage:5,current:2,efficiency:0.85,rippleMv:30},fuse:{rating:5,i2t:12},controller:{voltage:5,current:0.8,minVoltage:4.75,maxVoltage:5.25,rippleMv:50}};
export const WIRES={0.2:0.087,0.5:0.035,1:0.017,minLength:0.2,maxLength:3};
export const lessonBinding={mount:'K6-01',strain:'K6-01',center:'K6-01',placement:'K6-01',voltage:'K1-02',polarity:'K0-02',breakdown:'K1-04',fuse:'K1-06',ripple:'K1-04',heat:'K1-06',wire:'K1-02'};
export const ISSUE_COPY={
mount:'模块会松动；固定点少于 2 个。双点约束可防止转动。',
strain:'接点受拉；没有应力释放。夹线可把拉力从端子移开。',
center:'工作台会倾倒；重心超出支撑。重心投影应在支撑内部。',
placement:'模块未就位；四个导轨槽尚未装齐。固定模块才能承受接线拉力。',
voltage:'控制器可能重启；负载电压超出 4.75–5.25V。线阻与接触电阻产生 I×R 压降。',
polarity:'端口极性接反；正负端连接颠倒。反向电压可能损坏控制器。',
breakdown:'控制器输入击穿；24V 直接接入 5V 端。额定输入窗口不能靠保险丝代替。',
fuse:'保护裕量偏离；健康窗口为 1.2–2.0。额定电流过大可能无法及时保护。',
ripple:'控制器信号不稳；纹波超过 50mV。长线耦合噪声，屏蔽可降低拾取。',
heat:'导线温升过高；温度超过 60℃。I²R 发热需要足够散热。',
wire:'导线已隔离；该段本次不可再用。牺牲故障段阻断能量路径。'};
const num=(x,d)=>Number.isFinite(x)?x:d;
export function freshAssembly(){return {wireArea:0.2,length:2,connection:'jumper',quality:90,aged:false,shielded:false,fixedPoints:0,strainRelief:false,centered:true,placed:[],polarity:'normal',port:'buck',fuseRating:5,powered:false,elapsed:0,stage:0,heat:0,fuseEnergy:0,fuseBlown:false,isolated:false,extinguishers:1};}
export function simulateAssembly(s={}){
 const length=Math.min(3,Math.max(0.2,num(s.length,2))),area=[0.2,0.5,1].includes(s.wireArea)?s.wireArea:0.2;
 const c=CONNECTIONS[s.connection]||CONNECTIONS.jumper;
 const contact=c.resistance+(s.connection==='jumper'&&s.aged?0.05:0)+(s.connection==='solder'&&num(s.quality,90)<60?0.05:0);
 const load=Math.max(0,num(s.loadCurrent,0.8)),loss=load*(1/0.85-1),totalCurrent=load+loss;
 const resistance=2*length*WIRES[area]+2*contact,drop=totalCurrent*resistance;
 const voltageAtLoad=s.port==='direct24'?24-drop:s.polarity==='reverse'?-(5-drop):5-drop;
 const structureIssues=[];
 if(num(s.fixedPoints,0)<2)structureIssues.push('mount');
 if(!s.strainRelief)structureIssues.push('strain');
 if(s.centered===false)structureIssues.push('center');
 if(new Set(s.placed||[]).size!==4||!Object.keys(MODULES).every(id=>(s.placed||[]).includes(id)))structureIssues.push('placement');
 const score=Math.max(0,100-structureIssues.reduce((v,id)=>v+({mount:50,strain:25,center:50,placement:50}[id]),0));
 const fuseMargin=num(s.fuseRating,5)/Math.max(totalCurrent,0.000001),temperatureC=25+totalCurrent**2*resistance*20/(s.connection==='glue'?0.8:1),warnings=[];
 if(fuseMargin<1.2-1e-9||fuseMargin>2+1e-9)warnings.push('fuse');
 if(voltageAtLoad<4.75||voltageAtLoad>5.25)warnings.push('voltage');
 if(s.polarity==='reverse')warnings.push('polarity');
 if(s.port==='direct24')warnings.push('breakdown');
 if(s.isolated)warnings.push('wire');
 if(temperatureC>60)warnings.push('heat');
 const rippleMv=30+length*2+(!s.shielded&&length>1.5?(length-1.5)*40:0),issues=rippleMv>50?['ripple']:[];
 const ok=score>=60&&!structureIssues.length&&warnings.every(id=>id==='fuse')&&!issues.length&&totalCurrent<=1.2;
 return {ok,structure:{score,issues:structureIssues},power:{totalCurrent,branchCurrents:{controller:load,conversionLoss:loss},drops:[{id:'controller',resistance,contactResistance:contact,voltage:drop}],fuseMargin,temperatureC,warnings,score:Math.max(0,100-warnings.length*15)},signal:{rippleMv,marginMv:50-rippleMv,shielded:!!s.shielded,issues,score:Math.max(0,100-issues.length*50)},verdict:ok?'三图通过，可进行预检与实测':'尚未通过，请依据工程图调整',predicted:{current:totalCurrent,voltageAtLoad,dropPercent:drop/5*100,tempRise:temperatureC-25}};
}
// I²R / cooling and excess I²t as in street/circuit.mjs. Fuse clears first;
// later stages replay stored fault energy with the source disconnected.
export function faultChain(s,dt){
 if(!s.fuseBlown&&s.polarity!=='reverse'&&s.port!=='direct24'&&simulateAssembly(s).power.totalCurrent<=MODULES.buck5.current)return {...s};
 if((!s.powered&&!s.fuseBlown)||s.stopped)return {...s};
 let n={...s},remaining=Math.max(0,Math.min(60,num(dt,0)));
 while(remaining>1e-9){
 const step=Math.min(0.02,remaining);remaining-=step;n.elapsed=num(n.elapsed,0)+step;
 const current=n.fuseBlown?0:16;
 n.heat=Math.max(0,num(n.heat,0)+(current**2*0.12-num(n.heat,0)*0.08)*step);
 n.fuseEnergy=num(n.fuseEnergy,0)+Math.max(0,current**2-num(n.fuseRating,5)**2)*step;
 if(n.fuseEnergy>=12){n.fuseBlown=true;n.powered=false;}
 n.stage=n.fuseBlown?Math.min(3,Math.floor(n.elapsed)):0;
 }return n;
}
export function applyFireAction(s,action){
 if(action==='powerCut')return {...s,powered:false,stopped:true,verifiedSeconds:0};
 if(action==='extinguisher'&&s.extinguishers>0)return {...s,powered:false,stopped:true,heat:0,extinguishers:s.extinguishers-1,verifiedSeconds:0};
 if(action==='isolate')return {...s,powered:false,stopped:true,isolated:true,verifiedSeconds:0};
 return {...s};
}
export function canComplete(s,preflight,seconds){return preflight===true&&seconds>=20&&simulateAssembly(s).ok&&!s.fuseBlown&&!s.isolated;}
export function freshSave(){return {version:1,completed:false,cases:{tempPowerBridge:{done:false,bestStructure:0,bestPower:0,bestSignal:0}},failures:[],unlockedReference:false,consumed:{extinguishers:0},updatedAt:0};}
export function restoreAssembly(raw){try{
 const d=typeof raw==='string'?JSON.parse(raw):raw;if(!d||d.version>1)return freshSave();
 const done=d.completed===true&&d.cases?.tempPowerBridge?.done===true,c=d.cases?.tempPowerBridge||{},bounded=x=>Math.max(0,Math.min(100,num(x,0)));
 return {...freshSave(),completed:done,cases:{tempPowerBridge:{done,bestStructure:bounded(c.bestStructure),bestPower:bounded(c.bestPower),bestSignal:bounded(c.bestSignal)}},unlockedReference:done,failures:Array.isArray(d.failures)?d.failures.filter(f=>f&&lessonBinding[f.issue]).slice(-50).map(f=>({issue:f.issue,lesson:lessonBinding[f.issue]})):[],consumed:{extinguishers:Math.max(0,Math.floor(num(d.consumed?.extinguishers,0)))},updatedAt:Math.max(0,num(d.updatedAt,0))};
 }catch{return freshSave();}}
export function completeAssembly(save,s,preflight,seconds,now){
 if(!canComplete(s,preflight,seconds))return save;const r=simulateAssembly(s),c=save.cases.tempPowerBridge;
 return {...save,completed:true,unlockedReference:true,cases:{tempPowerBridge:{done:true,bestStructure:Math.max(c.bestStructure,r.structure.score),bestPower:Math.max(c.bestPower,r.power.score),bestSignal:Math.max(c.bestSignal,r.signal.score)}},updatedAt:now};
}
export const assemblyReward=save=>({xp:save.completed?100:0,prisms:save.completed?1:0});
