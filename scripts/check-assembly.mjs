import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out=process.env.SPARKMATE_ASSEMBLY_OUTPUT||'test-results/assembly-m3';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[],shaders=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|GL_INVALID/i.test(m.text()))shaders.push(m.text());});
const shot=name=>page.screenshot({path:out+'/'+name+'.png'});
const keys=['sparkmate.routes.v2',...['street','kickback','resonance'].map(s=>'sparkmate.seventh-checksum.'+s+'.v1')];
const snapshots=()=>page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),keys);
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.assembly.v1')));
async function scene(){return page.evaluate(async()=>{
 const entries=performance.getEntriesByType('resource'),entry=entries.find(e=>e.name.includes('/@react-three_fiber.js'));
 if(!entry)return {};const {_roots}=await import(entry.name);const root=_roots.get(document.querySelector('.scene-stage canvas'));if(!root)return {};
 const r=root.store.getState();return {...r.camera.userData};
});}
async function walk(key,predicate){
 await page.locator('#exploration-input').focus();await page.keyboard.down(key);
 try{await expect.poll(async()=>predicate(await scene()),{timeout:25000,intervals:[100]}).toBe(true);}finally{await page.keyboard.up(key);}
}
const panel=page.locator('[data-assembly-panel]');
const select=(name,value)=>panel.getByLabel(name,{exact:true}).selectOption(value);
async function enter(){
 await page.getByRole('button',{name:'开始自由探索',exact:true}).click({timeout:60000});
 await expect.poll(async()=>(await scene()).cameraOwner,{timeout:60000}).toBe('p9-character');
 await walk('KeyS',s=>s.player.z<.15);
 await page.mouse.move(1300,650);await page.mouse.down();await page.mouse.move(776.4,650,{steps:18});await page.mouse.up();
 await walk('KeyW',s=>s.player.x>10.3);
 await expect(page.locator('[data-assembly-bench]')).toBeVisible();
 await page.locator('[data-assembly-bench]').click();
}
try{
 await page.goto('http://127.0.0.1:15262/?quality=3&world=p9');
 await enter();await expect(panel).toBeVisible();await shot('01-assembly-bench');
 // Snapshot after entering existing street systems; M3 must not change these bytes.
 const before=await snapshots(),position=(await scene()).player;
 await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.up('KeyW');
 const after=(await scene()).player;expect(Math.hypot(position.x-after.x,position.z-after.z)).toBeLessThan(.02);
 checks.push('模态冻结探索输入');
 for(const name of ['24V 电源','5A 保险丝','24→5V 降压','冷库控制器'])await panel.getByRole('button',{name:name+' ＋',exact:true}).click();
 await select('固定点','2');await panel.getByLabel('应力释放',{exact:true}).check();await panel.getByLabel('屏蔽线',{exact:true}).check();
 await panel.getByRole('tab',{name:'供电图',exact:true}).click();await shot('02-wiring-grid');
 await panel.locator('[data-assembly-preflight]').click();
 await expect(panel.locator('[data-assembly-verdict]')).toContainText('尚未通过');
 await expect(panel.getByRole('tabpanel')).toContainText('控制器可能重启');
 await select('导线截面','1');
 for(const t of ['结构图','供电图','信号图']){await panel.getByRole('tab',{name:t,exact:true}).click();await expect(panel.getByRole('tabpanel')).toBeVisible();}
 await shot('03-three-diagrams');checks.push('细线压降失败，粗线三图通过');
 await panel.locator('[data-assembly-preflight]').click();await expect(panel.locator('[data-assembly-verdict]')).toContainText('预检通过');await shot('04-preflight');
 const started=Date.now();await panel.locator('[data-assembly-power]').click();
 await expect(panel.locator('[data-assembly-reward]')).toBeVisible({timeout:35000});
 expect(Date.now()-started).toBeGreaterThanOrEqual(19500);
 expect((await saved()).completed).toBe(true);await shot('05-live-test-pass');checks.push('真实20秒实测与独立奖励');
 const failures=(await saved()).failures.length;
 await select('极性','reverse');await panel.locator('[data-assembly-power]').click();
 await expect(panel.locator('[data-assembly-fault]')).toContainText('保险丝已先断');
 await expect(panel.locator('.assembly-meter')).toContainText('0.000 V · 0.000 A');await shot('06-polarity-fault');await page.waitForTimeout(1100);await shot('07-fuse-first');
 await expect(panel.locator('[data-assembly-fault]')).toContainText('明火',{timeout:6000});
 expect((await saved()).failures.length).toBe(failures+1);
 await panel.getByRole('button',{name:'断电',exact:true}).click();await panel.getByRole('button',{name:/^失败图鉴/}).click();await shot('08-failure-gallery');
 await panel.getByRole('button',{name:'参考答案',exact:true}).click();await expect(panel.getByRole('table')).toBeVisible();await shot('09-reference-solution');
 checks.push('反接保险先断、故障四阶段、图鉴与参考解锁');
 expect(await snapshots()).toEqual(before);const archive=await saved();
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
 await page.reload();expect(await saved()).toEqual(archive);expect(await snapshots()).toEqual(before);
 checks.push('刷新持久化、奖励幂等、四键字节不变、Esc关闭');
 // Narrow viewport through real inputs, no progress injection.
 await enter();await page.setViewportSize({width:390,height:844});
 await panel.getByRole('button',{name:'参考答案',exact:true}).click();await expect(panel.getByRole('table')).toBeVisible();
 expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);checks.push('390px可滚动无横溢');
 await page.keyboard.press('Escape');
 for(const tier of [0,1,2]){await page.goto('http://127.0.0.1:15262/?quality='+tier+'&world=p9');await page.waitForTimeout(700);expect(await page.locator('[data-assembly-bench],[data-assembly-panel]').count()).toBe(0);}
 checks.push('Tier 0/1/2 无装配入口');
 expect(errors).toEqual([]);expect(shaders).toEqual([]);
 writeFileSync(out+'/assembly-checks.json',JSON.stringify({passed:true,checks,errors,shaders},null,2),'utf8');
}catch(e){await shot('failure');writeFileSync(out+'/assembly-checks.json',JSON.stringify({passed:false,checks,error:String(e),errors,shaders},null,2),'utf8');throw e;}
finally{
 await browser.close();
 const paths=[...readdirSync(out).filter(f=>!f.includes('validation-summary')).map(f=>out+'/'+f),...['assembly.mjs','assemblyStore.js','AssemblyEntry.jsx','AssemblyPanel.jsx','assembly.css'].map(f=>'src/features/assembly/'+f),'src/features/street/StreetOverlay.jsx','tests/assembly.unit.mjs','scripts/check-assembly.mjs'];
 writeFileSync(out+'/validation-summary.json',JSON.stringify({checks,errors,shaders,sha256:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))},null,2),'utf8');
}
console.log(JSON.stringify({passed:true,checks,errors,shaders}));
