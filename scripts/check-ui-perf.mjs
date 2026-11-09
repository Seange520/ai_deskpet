import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const out = process.env.SPARKMATE_UI_OUTPUT || 'D:/deepseek_file/work/codex-runs/q1-evidence';
mkdirSync(out, {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))errors.push(m.text());});
try {
  await page.addInitScript(()=>performance.setResourceTimingBufferSize(5000));
  await page.goto((process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262')+'/?quality=3&world=p9');
  await page.getByRole('button',{name:'开始自由探索',exact:true}).click({timeout:60000});
  await expect(page.locator('#exploration-input')).toBeVisible();
  await page.waitForTimeout(3000);
  const metrics=await page.evaluate(async()=>{
    const entry=performance.getEntriesByType('resource').find(r=>r.name.includes('/@react-three_fiber.js'));
    const {_roots}=await import(entry.name);
    const root=_roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    const intervals=[],calls=[],triangles=[];
    const gl=root.gl, originalRender=gl.render;
    let frameCalls=0, frameTriangles=0;
    // Test-only observation. Delegate every render unchanged, including postprocessing.
    function observedRender(...args) {
      const beforeCalls=gl.info.autoReset?0:gl.info.render.calls;
      const beforeTriangles=gl.info.autoReset?0:gl.info.render.triangles;
      const result=originalRender.apply(this,args);
      frameCalls+=Math.max(0,gl.info.render.calls-beforeCalls);
      frameTriangles+=Math.max(0,gl.info.render.triangles-beforeTriangles);
      return result;
    }
    gl.render=observedRender;
    const start=performance.now();let previous=start;
    try { await new Promise(resolve=>{function frame(now){intervals.push(now-previous);previous=now;calls.push(frameCalls);triangles.push(frameTriangles);frameCalls=0;frameTriangles=0;if(now-start<30000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);}); } finally { if(gl.render===observedRender)gl.render=originalRender; }
    const fps=intervals.filter(x=>x>0).map(x=>1000/x).sort((a,b)=>a-b);
    return {sampleMs:previous-start,frameCount:intervals.length,fpsAvg:1000*intervals.length/(previous-start),fpsP5:fps[Math.floor(fps.length*.05)],drawCalls:Math.max(...calls),triangles:Math.max(...triangles),domNodes:document.querySelectorAll('*').length,hudNodes:document.querySelectorAll('.hud-capsules,.hud-capsules *').length,renderer:root.gl.getContext().getParameter(root.gl.getContext().RENDERER)};
  });
  const path='docs/ui-perf-baseline.json';
  const previousBaseline=existsSync(path)?JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')):null;
  const baseline=previousBaseline?.samplingVersion===2?previousBaseline:null;
  const result={...metrics,samplingVersion:2,targets:{fpsAvgAtLeast55:metrics.fpsAvg>=55,fpsP5AtLeast40:metrics.fpsP5>=40,drawCallsWithin10Pct:baseline?metrics.drawCalls<=baseline.drawCalls*1.1:null,hudNodesWithin250:metrics.hudNodes<=250},at:new Date().toISOString(),viewport:{width:1920,height:1080},errors,baselineComparison:baseline?{fpsAvgRatio:metrics.fpsAvg/baseline.fpsAvg,fpsP5Ratio:metrics.fpsP5/baseline.fpsP5,drawCallsRatio:metrics.drawCalls/baseline.drawCalls,domNodesDelta:metrics.domNodes-baseline.domNodes}:null,baselineKind:baseline?'existing':'first-run',sampling:'requestAnimationFrame; sum of renderer.render per-call info across scene and postprocessing, peak frame totals over 30 seconds; DOM total at end'};
  writeFileSync(out+'/ui-perf.json',JSON.stringify(result,null,2),'utf8');
  if(!baseline)writeFileSync(path,JSON.stringify(result,null,2),'utf8');
  console.log(JSON.stringify(result,null,2));
  expect(errors).toEqual([]);
  expect(metrics.sampleMs).toBeGreaterThanOrEqual(30000);
  expect(metrics.drawCalls).toBeGreaterThan(0);
} finally {await browser.close();}
