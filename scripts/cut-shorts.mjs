import { readdir, stat, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const root = resolve('../work/store/trailer');
const raw = resolve(root, 'raw');
const build = resolve(root, 'shorts-build');
const out = resolve(root, 'shorts');
await rm(build, { recursive: true, force: true });
await mkdir(build, { recursive: true });
await mkdir(out, { recursive: true });

function run(args, label) {
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-y', ...args], { stdio: 'pipe' });
  } catch (error) {
    const stderr = String(error.stderr || '');
    throw new Error(label + ' failed: ' + stderr.split('\n').slice(-12).join('\n'));
  }
}

function assTime(seconds) {
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

function assHeader() {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Short,Microsoft YaHei,56,&H00F2FBFA,&H00FFFFFF,&H00101010,&H64000000,0,0,0,0,100,100,1,0,1,3,0,2,80,80,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginV, Effect, Text
`;
}

const entries = (await readdir(raw)).filter((name) => name.endsWith('.webm'));
const items = await Promise.all(
  entries.map(async (name) => ({ name, mtime: (await stat(join(raw, name))).mtimeMs })),
);
items.sort((a, b) => a.mtime - b.mtime);
const sceneNames = ['01-boot', '02-street', '03-panel', '04-lesson-ad06', '05-lesson-ad18'];
const byName = Object.fromEntries(sceneNames.map((name, i) => [name, items[i]?.name]));

const BGM = join(build, 'bgm-short.wav');
run(
  [
    '-f', 'lavfi', '-i', 'sine=frequency=55:duration=16',
    '-f', 'lavfi', '-i', 'sine=frequency=110:duration=16',
    '-f', 'lavfi', '-i', 'anoisesrc=duration=16:color=brown:amplitude=0.03',
    '-filter_complex',
    '[0:a]volume=0.2[a];[1:a]volume=0.09[b];[2:a]lowpass=f=650[c];[a][b][c]amix=inputs=3:duration=longest,afade=t=in:st=0:d=1.2,afade=t=out:st=13.5:d=2.5[out]',
    '-map', '[out]', '-ar', '48000', '-ac', '2', BGM,
  ],
  'bgm',
);

const shorts = [
  { id: '01-street', scene: '02-street', start: 11, t: 10, text: '先测量，再得出结论。' },
  { id: '02-expression', scene: '04-lesson-ad06', start: 16.4, t: 7, text: '从零造一台会呼吸的桌宠。', mode: 'fit' },
  { id: '03-graduation', scene: '05-lesson-ad18', start: 15, t: 8, text: '每一个判断，都记在档案里。', mode: 'fit' },
  { id: '04-hook', scene: '01-boot', start: 6.2, t: 6.5, text: '每一次读数，都是城市醒来的一次心跳。' },
];

const rendered = [];
for (const item of shorts) {
  const source = join(raw, byName[item.scene]);
  const cut = join(build, item.id + '.mp4');
  const videoFilter =
    item.mode === 'fit'
      ? '[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4[b];[fg]scale=1080:-2[f];[b][f]overlay=0:(H-h)/2,setsar=1,fps=30,format=yuv420p'
      : 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,format=yuv420p';
  run(
    [
      '-ss', String(item.start),
      '-i', source,
      '-t', String(item.t),
      '-filter_complex', videoFilter,
      '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', cut,
    ],
    'cut ' + item.id,
  );

  const ass = join(build, item.id + '.ass');
  const dialogue = `Dialogue: 0,${assTime(0.6)},${assTime(item.t - 0.6)},Short,,0,0,0,,${item.text}\n`;
  await writeFile(ass, assHeader() + dialogue, 'utf8');

  const assRel = relative(process.cwd(), ass).replaceAll('\\', '/');
  const final = join(out, `short-vertical-${item.id}.mp4`);
  run(
    [
      '-i', cut,
      '-i', BGM,
      '-vf', 'ass=' + assRel,
      '-map', '0:v:0', '-map', '1:a:0',
      '-t', String(item.t),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', final,
    ],
    'final ' + item.id,
  );
  const size = (await stat(final)).size;
  rendered.push({ id: item.id, file: final, seconds: item.t, sizeMB: Math.round(size / 1024 / 1024) });
}

await writeFile(join(out, 'manifest.json'), JSON.stringify(rendered, null, 2), 'utf8');
console.log(JSON.stringify({ shorts: rendered.length, files: rendered.map((r) => r.id) }));
