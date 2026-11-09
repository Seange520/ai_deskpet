import { readdir, stat, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const root = resolve('../work/store/trailer');
const raw = resolve(root, 'raw');
const build = resolve(root, 'build');
await rm(build, { recursive: true, force: true });
await mkdir(build, { recursive: true });

function run(args, label) {
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-y', ...args], { stdio: 'pipe' });
  } catch (error) {
    const stderr = String(error.stderr || '');
    throw new Error(label + ' failed: ' + stderr.split('\n').slice(-12).join('\n'));
  }
}

function probeDuration(file) {
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (error) {
    const text = String(error.stderr || '');
    const match = text.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (match) return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  return 0;
}

const entries = (await readdir(raw))
  .filter((name) => name.endsWith('.webm'))
  .map(async (name) => ({ name, mtime: (await stat(join(raw, name))).mtimeMs }))
  .map((p) => p);
const items = await Promise.all(entries);
items.sort((a, b) => a.mtime - b.mtime);

const sceneNames = ['01-boot', '02-street', '03-panel', '04-lesson-ad06', '05-lesson-ad18'];
const sceneTargets = { '01-boot': 9, '02-street': 17, '03-panel': 15, '04-lesson-ad06': 20, '05-lesson-ad18': 18 };
if (items.length !== sceneNames.length) {
  throw new Error(`expected ${sceneNames.length} webm clips, got ${items.length}`);
}

const segments = [];
const report = [];
for (let i = 0; i < items.length; i += 1) {
  const src = join(raw, items[i].name);
  const duration = probeDuration(src);
  const dst = join(build, `${sceneNames[i]}.mp4`);
  const trim = Math.min(sceneTargets[sceneNames[i]], Math.max(3, duration - 0.4));
  run(
    [
      '-ss', '0.3',
      '-i', src,
      '-t', String(trim),
      '-vf',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x061318,fps=30,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30',
      '-an', dst,
    ],
    'transcode ' + sceneNames[i],
  );
  segments.push(dst);
  report.push({ scene: sceneNames[i], source: items[i].name, duration, output: dst });
}

// Intro card from page background, 3.0s, fade in
const pageBg = resolve('../work/store/capsules/page-bg-1438x810.png');
const intro = join(build, '00-intro.mp4');
run(
  [
    '-loop', '1', '-i', pageBg,
    '-t', '3.0',
    '-vf',
    'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x061318,fps=30,format=yuv420p,fade=t=in:st=0:d=0.8,fade=t=out:st=2.4:d=0.6',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-an', intro,
  ],
  'intro',
);

// Outro card from main capsule, 3.0s, fade out
const main = resolve('../work/store/capsules/main-616x353.png');
const outro = join(build, '99-outro.mp4');
run(
  [
    '-loop', '1', '-i', main,
    '-t', '3.0',
    '-vf',
    'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x061318,fps=30,format=yuv420p,fade=t=in:st=0:d=0.6,fade=t=out:st=2.2:d=0.8',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-an', outro,
  ],
  'outro',
);

const list = join(build, 'concat.txt');
const all = [intro, ...segments, outro];
await writeFile(list, all.map((p) => `file '${p.replaceAll('\\', '/')}'`).join('\n'), 'utf8');

const final = resolve(root, 'seventh-checksum-trailer-draft-1080p30.mp4');
run(
  ['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', final],
  'concat',
);

const outSize = (await stat(final)).size;
report.push({ final, bytes: outSize, seconds: all.length, note: 'draft: silent, crossfades pending' });
await writeFile(resolve(root, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ final, sizeMB: Math.round(outSize / 1024 / 1024), segments: report.length - 1 }));
