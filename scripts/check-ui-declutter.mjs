import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const out=process.env.SPARKMATE_UI_OUTPUT || 'D:/deepseek_file/work/codex-runs/q1-evidence';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[],checks=[],screenshots=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))errors.push(m.text());});
async function shot(name){const path=out+'/'+name+'.png';await page.screenshot({path});screenshots.push(path);}
function check(name,value,pass){checks.push({name,value,pass});if(!pass)throw Error(name+': '+JSON.stringify(value));}
async function scene(){return page.evaluate(async()=>{const entry=performance.getEntriesByType('resource').find(r=>r.name.includes('/@react-three_fiber.js'));if(!entry)return {};const {_roots}=await import(entry.name);return _roots.get(document.querySelector('.scene-stage canvas'))?.store.getState().camera.userData || {};});}
async function walk(key,predicate){await page.locator('#exploration-input').focus();await page.keyboard.down(key);try{await expect.poll(async()=>predicate(await scene()),{timeout:30000,intervals:[100]}).toBe(true);}finally{await page.keyboard.up(key);}}
async function layout(label,min){
 const value=await page.evaluate(()=>{
  // Conservative union of full element rectangles, including translucent panels.
  // Each CSS pixel is counted once; this is a layout assertion, not a visual estimate.
  const selectors=['#ecctrl-joystick','.exploration-jump','.exploration-caption','.street-title','.street-meter','.kickback-panel','.kickback-launch','.street-vendor','.world-minimap','.hud-capsules','.hud-hint.visible','.street-hazard','.street-reward','.raid-entry','.raid-panel','.env-entry','.trust-entry','.assembly-entry','.resonance-hud'];
  const rects=selectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(e=>{const r=e.getBoundingClientRect();return {selector:e.className,x:Math.max(0,Math.floor(r.left)),y:Math.max(0,Math.floor(r.top)),right:Math.min(innerWidth,Math.ceil(r.right)),bottom:Math.min(innerHeight,Math.ceil(r.bottom))};}).filter(r=>r.right>r.x&&r.bottom>r.y);
  let covered=0;
  for(let y=0;y<innerHeight;y++){const runs=rects.filter(r=>y>=r.y&&y<r.bottom).map(r=>[r.x,r.right]).sort((a,b)=>a[0]-b[0]);let end=0;for(const [x,right]of runs){covered+=Math.max(0,right-Math.max(x,end));end=Math.max(end,right);}}
  const buttons=[...document.querySelectorAll('.exploration-caption button,.street-meter button,.world-minimap button,.hud-capsules button')].filter(e=>e.checkVisibility({checkVisibilityCSS:true})).map(e=>{const r=e.getBoundingClientRect();return {name:e.textContent.trim(),w:r.width,h:r.height};});
  const nodes=selectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}));
  const floats=nodes.filter(e=>!e.matches('#ecctrl-joystick,.exploration-jump')&&!nodes.some(parent=>parent!==e&&parent.contains(e))).map(e=>e.className);
  const occluded=[...document.querySelectorAll('.exploration-caption button,.teaching-entry')].filter(e=>e.checkVisibility({checkVisibilityCSS:true})).filter(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !hit||!e.contains(hit);}).map(e=>e.textContent.trim());
  const smallText=[];
  for(const region of document.querySelectorAll('.exploration-caption,.street-meter,.world-minimap')){
   const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){const text=walker.currentNode,parent=text.parentElement;if(text.textContent.trim()&&parent.checkVisibility({checkVisibilityCSS:true})&&parseFloat(getComputedStyle(parent).fontSize)<13)smallText.push({text:text.textContent.trim(),size:getComputedStyle(parent).fontSize});}
  }
  return {floats,smallText,occluded,visibleRatio:1-covered/(innerWidth*innerHeight),covered,total:innerWidth*innerHeight,rects,buttons,scrollWidth:document.documentElement.scrollWidth,width:innerWidth};
 });
 check(label+' scene area',value,value.visibleRatio>=min);
 check(label+' safe-area buttons unobstructed',value.occluded,value.occluded.length===0);
 check(label+' resident overlays <=2',value.floats,value.floats.length<=2);
 check(label+' resident text >=13px',value.smallText,value.smallText.length===0);
 check(label+' no horizontal scroll',value.scrollWidth,value.scrollWidth<=value.width);
 check(label+' button targets',value.buttons,value.buttons.every(b=>b.w>=40&&b.h>=40));
 return value;
}
try{
 await page.addInitScript(()=>performance.setResourceTimingBufferSize(5000));
 await page.goto((process.env.SPARKMATE_SPACE_URL||'http://127.0.0.1:15262')+'/?quality=3&world=p9');
 await page.getByRole('button',{name:'开始自由探索',exact:true}).click({timeout:60000});
 await expect.poll(async()=>(await scene()).cameraOwner,{timeout:60000}).toBe('p9-character');
 await walk('KeyS',s=>s.player?.z<.15);
 await page.mouse.move(1300,650);await page.mouse.down();await page.mouse.move(776.4,650,{steps:18});await page.mouse.up();
 await walk('KeyW',s=>s.player?.x>6.2);
 await page.waitForTimeout(3200);
 const hint=await page.locator('.hud-hint').evaluate(e=>({opacity:getComputedStyle(e).opacity,pointerEvents:getComputedStyle(e).pointerEvents,bottom:innerHeight-e.getBoundingClientRect().bottom}));
 check('hint fades at 3s and does not capture interaction',hint,Number(hint.opacity)===0&&hint.pointerEvents==='none'&&hint.bottom>=120);
 await shot('01-1920-normal');await layout('1920 normal',.55);
 await page.getByRole('button',{name:/开启鹰眼透视/}).click();
 await expect(page.locator('html')).toHaveAttribute('data-hud-left','true');
 await shot('02-1920-measuring');
 check('measurement folds task',await page.locator('html').getAttribute('data-hud-left'),true);
 await page.getByRole('button',{name:/关闭鹰眼透视/}).click();
 await expect(page.locator('html')).toHaveAttribute('data-hud-left','true');
 const ended=Date.now();
 await expect(page.locator('html')).toHaveAttribute('data-hud-left','false',{timeout:3000});
 check('restores after 2s',Date.now()-ended,Date.now()-ended>=1800&&Date.now()-ended<3000);
 const contrasts=await page.evaluate(()=>{
  const lum=rgb=>{const a=rgb.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
  return ['.street-lcd output','.hud-capsules button','.hud-hint'].map(s=>{const e=document.querySelector(s),c=getComputedStyle(e);let p=e,bg;while(p){const v=getComputedStyle(p).backgroundColor.match(/[\d.]+/g)?.map(Number);if(v&&v[3]!==0){bg=v;break;}p=p.parentElement;}const fg=c.color.match(/[\d.]+/g).map(Number),a=lum(fg),b=lum(bg);return {selector:s,fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
 });
 check('three contrast samples >=4.5',contrasts,contrasts.every(c=>c.ratio>=4.5));
 await shot('05-contrast-check');
 await page.setViewportSize({width:390,height:844});
 // The existing accessible collapse control is exercised with a real pointer.
 await page.getByRole('button',{name:'收起仪表',exact:true}).click();
 await page.waitForTimeout(250);
 await shot('03-390-normal');await layout('390 normal',.50);
 await page.getByRole('button',{name:'展开仪表',exact:true}).click();
 await shot('04-390-drawer');
 await layout('390 drawer',0);
 await page.getByRole('button',{name:'返回教学 Esc',exact:true}).click();
 await expect(page.locator('#exploration-input')).toHaveCount(0);
 check('390 return real click',true,true);
 check('page and shader errors',errors,errors.length===0);
} catch(e){checks.push({name:'execution',pass:false,error:e.stack});process.exitCode=1;}
finally{writeFileSync(out+'/ui-checks.json',JSON.stringify({checks,screenshots,errors},null,2),'utf8');await browser.close();}
console.log(JSON.stringify(checks,null,2));
