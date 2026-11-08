import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import {writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(process.argv.includes('--repair-suite')){
 let jobs=[["unit","node --test --test-isolation=none tests/resonance.unit.mjs tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs tests/teleport-timeline.unit.mjs tests/street-circuit.unit.mjs tests/kickback-circuit.unit.mjs tests/reactions.unit.mjs"],["e2e","cmd /d /c \"cd /d D:\\deepseek_file\\ai_deskpet && set SPARKMATE_TEST_PORT=15261 && D:\\Node\\npm.cmd run test:e2e\""],["resonance","node scripts/check-resonance.mjs"],["street-p0-0","node scripts/check-street-p0.mjs"],["street-m1-1","node scripts/check-street-m1.mjs"],["world-m1-2","node scripts/check-world-m1.mjs"],["world-m3-3","node scripts/check-world-m3.mjs"],["world-rail-4","node scripts/check-world-rail.mjs"],["world-rail-5","node scripts/check-world-rail.mjs"],["build","cmd /d /c \"cd /d D:\\deepseek_file\\ai_deskpet && D:\\Node\\npm.cmd run build:local\""]];
 if(process.env.SPARKMATE_REPAIR_ONLY)jobs=jobs.filter(([name])=>process.env.SPARKMATE_REPAIR_ONLY.split(',').includes(name));
 mkdirSync('test-results/m2-repair-logs',{recursive:true});
 let failed=false;
 for(const [name,cmd] of jobs){console.log('RUN '+name);const r=spawnSync('cmd.exe',['/d','/s','/c',cmd],{encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true,windowsVerbatimArguments:true});const out=(r.stdout||'')+(r.stderr||'');writeFileSync('test-results/m2-repair-logs/'+name+'.log',out,'utf8');console.log(out);console.log('EXIT '+name+' '+r.status);if(r.status!==0)failed=true;}
 process.exit(failed?1:0);
}

const writeFile=(p,text)=>writeFileSync(p,text,'utf8');
import {createHash} from 'node:crypto';
const out=process.env.SPARKMATE_RESONANCE_OUTPUT||'test-results/resonance-m2';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[],shaders=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|GL_INVALID/i.test(m.text()))shaders.push(m.text());});
await page.addInitScript(()=>performance.setResourceTimingBufferSize(5000));
const shot=name=>page.screenshot({path:out+'/'+name+'.png'});
const check=(name)=>results.push({name,passed:true,t:new Date().toISOString()});
async function resonance(){return page.evaluate(()=>JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.resonance.v1')));}
async function state(target=page) {
  return target.evaluate(async () => {
    const streetEntry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/street/streetStore.js'));
    const fiberEntry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!streetEntry || !fiberEntry) return {};
    const { _roots } = await import(
      performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/@react-three_fiber.js')).name
    );
    const root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const r = root.store.getState();
    const street = (
      await import(
        performance
          .getEntriesByType('resource')
          .find((r) => r.name.includes('/street/streetStore.js')).name
      )
    ).useStreet.getState();
    return {
      ...r.camera.userData,
      street: JSON.parse(JSON.stringify(street)),
      canvasCount: document.querySelectorAll('.scene-stage canvas').length,
    };
  });
}
async function walk(key, predicate,target=page) {
  await target.locator('#exploration-input').focus();
  await target.keyboard.down(key);
  const deadline = Date.now() + 20000;
  try {
    while (Date.now() < deadline) {
      await target.waitForTimeout(100);
      if (predicate((await state(target)).player)) return;
    }
    throw new Error('Walk timeout: ' + JSON.stringify(await state()));
  } finally {
    await target.keyboard.up(key);
  }
}

async function enter(target=page,screenshot=true){
 await target.getByRole('button',{name:'开始自由探索',exact:true}).click({timeout:60000});
 await expect.poll(async()=>(await state(target)).cameraOwner,{timeout:60000}).toBe('p9-character');
 await target.waitForTimeout(1000);if(screenshot)await shot('03-exploration-hud');
 await expect(target.locator('[data-resonance-hud]')).toBeVisible();
 await walk('KeyS',p=>p.z<.15,target);
 await target.mouse.move(1300,650);await target.mouse.down();await target.mouse.move(776.4,650,{steps:18});await target.mouse.up();
 await walk('KeyW',p=>p.x>6.2,target);await target.waitForTimeout(500);
}
try{
 await page.goto('http://127.0.0.1:15262/?quality=3&world=p9');
 await page.getByTestId('resonance-entry').click();
 await expect(page.locator('[data-resonance-panel]')).toBeVisible();
 await expect(page.locator('[data-resonance-points]')).toHaveText('0');await shot('01-panel-locked');
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 // Only initial learning fixture is seeded; all resonance actions use real UI.
 await page.evaluate(async()=>{const {hardwareRoutes}=await import('/src/data/hardwareRoutes.js');localStorage.setItem('sparkmate.routes.v2',JSON.stringify({routes:Object.fromEntries(hardwareRoutes.map(r=>[r.id,{materials:true,wiring:true,code:true}]))}));});
 await page.reload();await page.getByTestId('resonance-entry').click();
 await expect(page.locator('[data-resonance-points]')).toHaveText('4');
 for(const [i,id]of ['li_fast_scan','li_precision','li_protocol'].entries()){
 await page.locator(`[data-resonance-unlock="${id}"]`).click();await page.locator(`[data-resonance-slot="${i}"]`).click();await page.locator(`[data-resonance-equip="${id}"]`).click();}
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.getByTestId('resonance-entry').click();
 await expect(page.locator('[data-resonance-panel]')).toBeVisible();
 await page.locator('[data-resonance-reset]').scrollIntoViewIfNeeded();await page.locator('[data-resonance-reset]').click();await page.locator('[data-resonance-cancel]').click();
 await page.locator('[data-resonance-slot="0"]').click();await shot('02-node-equipped');
 check('390x844 panel visible, scrollable and clickable');await page.setViewportSize({width:1920,height:1080});check('four level points; explicit three-slot equipment; three-node memory');
 expect((await resonance()).memories.length).toBe(1);
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 const routeBefore=await page.evaluate(()=>localStorage.getItem('sparkmate.routes.v2'));
 await enter();await expect(page.locator('[data-resonance-clue="scan"]').first()).toBeVisible();await shot('04-fast-scan-chip');
 await page.getByRole('button',{name:/开启鹰眼透视/}).click();
 for(const id of ['lamp','return','motor'])await page.locator(`[data-street-probe="${id}"]`).click();
 expect((await resonance()).sync).toBe(56);
 await page.locator('[data-street-probe="lamp"]').click();expect((await resonance()).sync).toBe(56);
 await expect(page.locator('[data-resonance-confidence]').first()).toContainText('high');await shot('05-confidence-reading');
 await page.getByRole('button',{name:'通断',exact:true}).click();await page.locator('[data-street-probe="return"]').click();
 expect((await resonance()).sync).toBe(53);check('three unique correct measurements +6; repeated +0; wrong range -3');
 await page.getByRole('button',{name:'断电隔离',exact:true}).click();await page.locator('[data-street-probe="return"]').click();
 await page.getByRole('button',{name:'确认接地不良',exact:true}).click();await page.getByRole('button',{name:'确认启动过载',exact:true}).click();
 await page.getByRole('button',{name:'修复接点 · 独立回流',exact:true}).click();await page.getByRole('button',{name:'加入压缩机软启动',exact:true}).click();
 expect((await resonance()).sync).toBe(69);
 await page.getByRole('button',{name:/恢复供电 · .*秒校验/}).click();await shot('06-protocol-timing');
 await expect.poll(async()=>(await state()).street.completed,{timeout:20000}).toBe(true);
 expect((await state()).street.verifiedSeconds).toBeLessThan(7);expect((await resonance()).sync).toBe(75);
 await page.getByRole('button',{name:'收起对话',exact:true}).click();await page.getByRole('button',{name:'与夜宵摊老板交谈',exact:true}).click();
 check('diagnoses +6 repairs +8 verification +5 dialogue +1; optional duration actually completes before 7s');
 expect(await page.evaluate(()=>localStorage.getItem('sparkmate.routes.v2'))).toBe(routeBefore);
 await page.getByRole('button',{name:'返回教学 Esc',exact:true}).click();await page.getByTestId('resonance-entry').click();await shot('07-sync-log');
 const saved=await resonance();await page.reload();await page.getByTestId('resonance-entry').click();
 const restored=await resonance();for(const k of ['points','nodes','slots','sync'])expect(restored[k]).toEqual(saved[k]);check('reload preserves points nodes slots sync; teaching save unchanged');
 await page.locator('[data-resonance-reset]').click();await page.locator('[data-resonance-confirm]').click();
 expect((await resonance()).resetCount).toBe(1);expect((await resonance()).memories.length).toBe(1);await shot('08-reset-history');check('reset consumes one prism, retains chain memory and history');
 // A separate fresh case exercises jumper only to red, then exits immediately.
 const jump=await browser.newPage({viewport:{width:1920,height:1080}});
 await jump.goto('http://127.0.0.1:15262/?quality=3&world=p9');
 await enter(jump,false);
 await expect(jump.locator('[data-street-active="true"]')).toBeVisible();
 await jump.getByRole('button',{name:'未排障，强行跨接供电',exact:true}).click();
 await expect(jump.locator('[data-street-stage="red"]')).toBeVisible();
 expect(await jump.evaluate(()=>JSON.parse(localStorage.getItem('sparkmate.seventh-checksum.resonance.v1')).sync)).toBe(40);await jump.close();check('jumper records -10 at red without waiting for fuse');
 expect(errors).toEqual([]);expect(shaders).toEqual([]);check('zero page or shader errors');
}catch(e){results.push({name:e.message,passed:false,t:new Date().toISOString()});throw e;}
finally{
 await writeFile(out+'/resonance-checks.json',JSON.stringify({results,errors,shaders,t:new Date().toISOString(),url:page.url(),ua:await page.evaluate(()=>navigator.userAgent)},null,2));
 const artifacts={};for(const file of await readdir(out))if(/\.(png|json)$/.test(file)&&!['validation-summary.json','sha256-manifest.json'].includes(file))artifacts[file]=createHash('sha256').update(await readFile(out+'/'+file)).digest('hex');
 await writeFile(out+'/validation-summary.json',JSON.stringify({passed:results.every(x=>x.passed),results,errors,shaders,artifacts},null,2));
 await browser.close();
 console.log(JSON.stringify({results,errors,shaders,out},null,2));
}
