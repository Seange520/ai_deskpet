import {useEffect,useRef,useState} from 'react';
import {motion} from 'framer-motion';
import {X,Zap,ShieldCheck} from 'lucide-react';
import {freshAssembly,simulateAssembly,faultChain,applyFireAction,ISSUE_COPY,lessonBinding,assemblyReward} from './assembly.mjs';
import {useAssembly} from './assemblyStore';
const names={power24:'24V 电源',fuse:'5A 保险丝',buck5:'24→5V 降压',controller:'冷库控制器'};
const order=['power24','fuse','buck5','controller'];
const stages=['过载','发热','打火','明火'];
export default function AssemblyPanel({onClose}){
 const [s,setS]=useState(freshAssembly),[tab,setTab]=useState('结构'),[pre,setPre]=useState(false),[running,setRunning]=useState(false),[seconds,setSeconds]=useState(0),[fault,setFault]=useState(false),[view,setView]=useState('工程图');
 const store=useAssembly(),r=simulateAssembly(s),ref=useRef(),failed=useRef(false),previous=useRef(document.activeElement);
 useEffect(()=>{
 ref.current.focus();
 const key=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();onClose();}if(e.key==='Tab'){const nodes=[...ref.current.querySelectorAll('button,input,select,[tabindex="0"]')].filter(n=>!n.disabled);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 window.addEventListener('keydown',key,true);return ()=>{window.removeEventListener('keydown',key,true);previous.current?.focus();};
 },[onClose]);
 useEffect(()=>{
 if(!running&&!fault)return;
 let last=performance.now();
 const timer=setInterval(()=>{
 const now=performance.now(),dt=Math.min((now-last)/1000,0.25);last=now;
 if(document.hidden||!document.hasFocus())return;
 if(fault){setS(v=>faultChain(v,dt));return;}
 setSeconds(v=>v+dt);
 },100);return ()=>clearInterval(timer);
 },[running,fault]);
 useEffect(()=>{if(running&&seconds>=20){store.complete(s,pre,seconds);setRunning(false);}},[seconds,running]);
 function update(patch){if(running||fault)return;setS(v=>({...v,...patch}));setPre(false);setSeconds(0);}
 function power(){
 if(r.structure.score<60||r.structure.issues.length||s.isolated||s.fuseBlown)return;
 if(s.polarity==='reverse'||s.port==='direct24'){
 setS(v=>({...v,powered:true,elapsed:0,stage:0}));setFault(true);setPre(false);
 if(!failed.current){store.fail(s.port==='direct24'?'breakdown':'polarity');failed.current=true;}return;
 }
 if(pre&&r.ok){setRunning(true);setSeconds(0);}
 }
 function action(a){setS(v=>applyFireAction(v,a));setFault(false);setRunning(false);setSeconds(0);setPre(false);if(a==='extinguisher'&&s.extinguishers>0)store.consume();}
 const issueList=tab==='结构'?r.structure.issues:tab==='供电'?r.power.warnings:r.signal.issues;
 const reward=assemblyReward(store.save);
 return <div className="modal-backdrop assembly-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
 <motion.section initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="assembly-panel" data-assembly-panel role="dialog" aria-modal="true" aria-labelledby="assembly-title" tabIndex={-1} ref={ref}>
 <header><div><small>熔炉外街 / 工程实训 03</small><h2 id="assembly-title">根之手装配台</h2><p>临时供电桥 · 冷库支路断电，为控制器提供稳定 5V</p></div><button aria-label="关闭装配台" onClick={onClose}><X/></button></header>
 <p className="assembly-disclaimer">教学仿真，不代表真实电气认证；实操须断电并核对器件资料</p>
 <div className="assembly-layout"><div>
 <div className="assembly-grid" data-fault-stage={fault?s.stage:'idle'}>
 <svg viewBox="0 0 760 225" role="img" aria-label="装配导轨与供电走线">
 <defs><pattern id="assembly-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#264454" strokeWidth=".6"/></pattern></defs>
 <rect width="760" height="225" fill="url(#assembly-grid)"/><path d="M35 88H725M35 158H725" stroke="#546a77" strokeWidth="8"/>
 <path d="M110 110H650" stroke={fault?'#ff815e':'#65dcc3'} strokeWidth={s.wireArea*3+2} strokeDasharray={s.placed.length===4?'0':'8 8'} fill="none"/>
 <path d="M650 150H110" stroke="#7293d3" strokeWidth="3"/>
 {order.map((id,i)=><g key={id}><rect x={35+i*185} y="65" width="140" height="105" rx="9" fill={s.placed.includes(id)?'#214f53':'#172d3b'} stroke="#79a7ad"/><text x={105+i*185} y="100" textAnchor="middle" fill="#e9f9ef" fontSize="16">{id==="fuse"?s.fuseRating+"A 保险丝":names[id]}</text><text x={105+i*185} y="136" textAnchor="middle" fill="#91c6bc" fontSize="13">{s.placed.includes(id)?'已吸附导轨':'等待模块'}</text></g>)}
 {fault&&<g aria-label={stages[s.stage]}>
 {s.stage>=1&&<g className="assembly-smoke" fill="#d8e7e6" opacity=".55"><circle cx="380" cy="75" r="12"/><circle cx="369" cy="54" r="16"/><circle cx="389" cy="33" r="18"/></g>}
 {s.stage===2&&<path className="assembly-spark" d="M380 95l-20 -28 12 28 -25 -5 26 15 -12 27 20 -21 19 25 -10 -30 27 -9 -28 1 5 -27Z" fill="#bceeff"/>}
 {s.stage===3&&<path className="assembly-flame" d="M356 115Q343 88 375 52Q369 75 390 84Q401 64 393 52Q430 111 397 126Q369 140 356 115Z" fill="#ff8c3e" stroke="#ffe08a" strokeWidth="3"/>}
 </g>}<text x="380" y="203" textAnchor="middle" fill="#99b6bf" fontSize="14">正极 → 保险 → 降压 → 负载 → 0V 工作回流</text></svg>
 </div>
 <fieldset disabled={running||fault}><legend>模块放置 · 点击吸附，或拖到对应槽</legend><div className="assembly-slots">{order.map(id=><button key={id} draggable={!s.placed.includes(id)} onDragStart={e=>e.dataTransfer.setData('text/plain',id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')===id)update({placed:[...new Set([...s.placed,id])]});}} onClick={()=>update({placed:[...new Set([...s.placed,id])]})}>{names[id]} {s.placed.includes(id)?'✓':'＋'}</button>)}</div>
 <div className="assembly-controls">
 <label>导线截面<select aria-label="导线截面" value={s.wireArea} onChange={e=>update({wireArea:+e.target.value})}><option value=".2">0.2 mm² · 轻便</option><option value=".5">0.5 mm² · 适中</option><option value="1">1.0 mm² · 粗硬</option></select></label>
 <label>单程线长 {s.length.toFixed(1)}m<input aria-label="导线长度" type="range" min=".2" max="3" step=".1" value={s.length} onChange={e=>update({length:+e.target.value})}/></label>
 <label>连接方式<select aria-label="连接方式" disabled={s.jointLocked} value={s.connection} onChange={e=>update({connection:e.target.value})}><option value="jumper">杜邦线 · 可拆 / 0.05Ω</option><option value="solder">焊接 · 不可拆 / 0.005Ω</option><option value="glue">胶合绝缘 · 不可拆 / 散热 −20%</option></select></label>
 <label>焊接质量<input aria-label="焊接质量" disabled={s.jointLocked} type="number" min="0" max="100" value={s.quality} onChange={e=>update({quality:+e.target.value})}/></label>
 <label>固定点<select aria-label="固定点" value={s.fixedPoints} onChange={e=>update({fixedPoints:+e.target.value})}><option value="0">0 个</option><option value="1">1 个</option><option value="2">2 个</option></select></label>
 <label>保险丝<select aria-label="保险丝" value={s.fuseRating} onChange={e=>update({fuseRating:+e.target.value})}><option value="5">5A</option><option value="10">10A · 保护更迟</option></select></label>
 <label>端口<select aria-label="端口" value={s.port} onChange={e=>update({port:e.target.value})}><option value="buck">降压输出 → 5V 端</option><option value="direct24">24V → 5V 端（危险）</option></select></label>
 <label>极性<select aria-label="极性" value={s.polarity} onChange={e=>update({polarity:e.target.value})}><option value="normal">正极接正极</option><option value="reverse">反接（危险）</option></select></label>
 {[['strainRelief','应力释放'],['centered','重心在支撑内'],['shielded','屏蔽线'],['aged','杜邦线老化']].map(([id,label])=><label key={id}><input type="checkbox" checked={s[id]} onChange={e=>update({[id]:e.target.checked})}/>{label}</label>)}
 </div></fieldset>
 <p className="assembly-note">三种连接均为预制电气端子的连接与固定抽象；胶体本身绝缘，不可当作导电材料。更改不可拆接点需重开本次装配。</p>
 </div><aside>
 <nav aria-label="装配复盘">{['工程图','失败图鉴','参考答案'].map(t=><button key={t} disabled={t==='参考答案'&&!store.save.unlockedReference} aria-pressed={view===t} onClick={()=>setView(t)}>{t}{t==='失败图鉴'?' '+store.save.failures.length:''}</button>)}</nav>
 {view==='工程图'&&<><div role="tablist" aria-label="三张工程图">{['结构','供电','信号'].map(t=><button key={t} role="tab" aria-selected={tab===t} onClick={()=>setTab(t)}>{t}图</button>)}</div>
 <div className="assembly-diagram" role="tabpanel">
 <h3>{tab}图 / {tab==='结构'?r.structure.score:tab==='供电'?r.power.score:r.signal.score} 分</h3>
 {tab==='结构'?<p>固定 {s.fixedPoints}/2 点 · {s.strainRelief?'已夹线':'端子受拉'} · {s.centered?'重心在支撑内':'重心越界'}</p>:tab==='供电'?<><p>24V → 保险 → 降压 → 5V 控制器</p><p>负载 {r.power.branchCurrents.controller.toFixed(3)} + 损耗 {r.power.branchCurrents.conversionLoss.toFixed(3)} = 总电流 {r.power.totalCurrent.toFixed(3)}A</p><p>回路电阻 {r.power.drops[0].resistance.toFixed(3)}Ω · 压降 {r.predicted.dropPercent.toFixed(2)}% · 保险裕量 {r.power.fuseMargin.toFixed(2)}</p></>:<><p>30mV 模块纹波 + 线长噪声</p><p>负载纹波 {r.signal.rippleMv.toFixed(1)}mV / 上限 50mV · 余量 {r.signal.marginMv.toFixed(1)}mV</p></>}
 {issueList.map(id=><p className="assembly-issue" key={id}>{ISSUE_COPY[id]} <a href={'#assembly-lesson-'+lessonBinding[id]} >{lessonBinding[id]}</a></p>)}
 {!issueList.length&&<p>该图校验通过。依据见上述测量值。</p>}
 </div>
 <output className="assembly-meter" aria-live="polite">{fault&&s.fuseBlown?"保险丝已断 · ":running?"上电实测 · ":"离线预测 · "}{(fault&&s.fuseBlown?0:r.predicted.voltageAtLoad).toFixed(3)} V · {(fault&&s.fuseBlown?0:r.predicted.current).toFixed(3)} A · {r.signal.rippleMv.toFixed(1)} mV<br/>温升 {r.predicted.tempRise.toFixed(1)}℃ · 实测 {Math.min(20,seconds).toFixed(1)} / 20 秒</output>
 <p>教学 20 秒对应连续工作 60 秒。修改接线将清除预检。</p>
 <button data-assembly-preflight disabled={running||fault} onClick={()=>{setPre(r.ok);if(s.connection!=='jumper')setS(v=>({...v,jointLocked:true}));if(!r.ok)store.fail([...r.structure.issues,...r.power.warnings.filter(id=>id!=='fuse'),...r.signal.issues][0]||'voltage');}}>仿真预检</button>
 <p data-assembly-verdict role="status">{pre?'预检通过 · 可上电':r.verdict}</p>
 <button data-assembly-power disabled={running||fault||r.structure.issues.length>0||s.isolated||s.fuseBlown||(!pre&&s.polarity!=='reverse'&&s.port!=='direct24')} onClick={power}><Zap size={15}/>上电实测</button></>}
 {view==='失败图鉴'&&<section><h3>你烧过的东西</h3><p>每次失败留下依据，不扣经验与棱镜。</p>{store.save.failures.map((f,i)=><article key={i}>{ISSUE_COPY[f.issue]} <strong>{f.lesson}</strong></article>)}</section>}
 {view==='参考答案'&&<section><h3>三角对比 · 供复盘</h3><p>参考只是一个满足当前条件的方案。请比较工程图，不能一键装入。</p><table><thead><tr><th>方案</th><th>结果与取舍</th></tr></thead><tbody><tr><td>1mm² / 2m / 屏蔽 / 双点夹线</td><td>杜邦端子可拆；约 4.842V，34mV；5A 裕量偏大仍须警告</td></tr><tr><td>0.2mm² / 2m</td><td>压降约 8.43%，低于输入窗口；轻便换来线损</td></tr><tr><td>1mm² / 3m / 无屏蔽</td><td>纹波 96mV 超限；线粗不能代替屏蔽</td></tr></tbody></table></section>}
 {fault&&<div className={'assembly-fault phase-'+s.stage} role="alert" data-assembly-fault><b>{stages[s.stage]} · {s.fuseBlown?'保险丝已先断':'保险丝 I²t 累积'}</b><p>阶段 {s.stage} · I²t {s.fuseEnergy.toFixed(1)} A²s · {s.heat.toFixed(2)} 热量单位</p><p>已切断后的白烟、火花与火苗为事故余热过程示意，不继续带电。仅损失本次时间。</p></div>}
 <div className="assembly-actions"><button onClick={()=>action('powerCut')}>断电</button><button disabled={s.extinguishers<1} onClick={()=>action('extinguisher')}>灭火器（{s.extinguishers}）</button><button disabled={s.isolated} onClick={()=>action('isolate')}>隔离并牺牲本段线</button><button onClick={()=>{setS(freshAssembly());setPre(false);setRunning(false);setFault(false);setSeconds(0);failed.current=false;}}>重开本次装配</button></div>
 {store.save.completed&&<div data-assembly-reward className="assembly-success"><ShieldCheck/>冷库灯亮 · {reward.xp} XP + {reward.prisms} 棱镜<p>“门边的灯亮了，控制器也没再重启。”</p><small>奖励存入装配独立记录，刷新不重复。</small></div>}
 <details className="assembly-lessons"><summary>知识点索引</summary>{Object.entries({"K0-02":"极性：上电前核对正负端与额定窗口。","K1-02":"压降：回路导线与接触电阻相加，再乘总电流。","K1-04":"信号与过压：额定输入窗口和纹波窗口均须满足。","K1-06":"保护与发热：I²R 产生热量，保险丝按过量 I²t 累积切断。","K6-01":"结构：双点固定、应力释放与重心支撑相互配合。"}).map(([id,text])=><p id={"assembly-lesson-"+id} key={id}><b>{id}</b> {text}</p>)}</details>{store.storageError&&<p role="alert">存档不可写，仅本次会话有效。</p>}
 </aside></div>
 </motion.section></div>;
}
