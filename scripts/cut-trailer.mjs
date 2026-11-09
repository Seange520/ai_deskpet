import { readdir, stat, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join, relative } from 'node:path';
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
    throw new Error(label + ' failed: ' + stderr.split('\n').slice(-14).join('\n'));
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

const sceneNames = ['01-boot', '02-street', '03-panel', '04-lesson-ad06', '05-lesson-ad18'];
const windows = {
  '01-boot': { start: 0.5, t: 9 },
  '02-street': { start: 2, t: 15 },
  '03-panel': { start: 5, t: 13 },
  '04-lesson-ad06': { start: 8, t: 14 },
  '05-lesson-ad18': { start: 8, t: 14 },
};
const subtitles = {
  '01-boot': '每一次读数，都是城市醒来的一次心跳。',
  '02-street': '先测量，再得出结论。',
  '03-panel': '不是看视频，是亲手把结论测出来。',
  '04-lesson-ad06': '从零造一台会呼吸的桌宠。',
  '05-lesson-ad18': '每一个判断，都记在档案里。',
};

const container = (file, start, t, dst) =>
  run(
    [
      '-ss', String(start),
      '-i', file,
      '-t', String(t),
      '-vf',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x061318,fps=30,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-an', dst,
    ],
    'transcode ' + dst,
  );

function card(image, t, dst, fadeOut) {
  run(
    [
      '-loop', '1', '-i', image,
      '-t', String(t),
      '-vf',
      `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x061318,fps=30,format=yuv420p,fade=t=in:st=0:d=0.8,fade=t=out:st=${Math.max(0, t - 0.8).toFixed(2)}:d=0.8`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-an', dst,
    ],
    'card ' + dst,
  );
}

const entries = (await readdir(raw)).filter((name) => name.endsWith('.webm'));
const items = await Promise.all(
  entries.map(async (name) => ({ name, mtime: (await stat(join(raw, name))).mtimeMs })),
);
items.sort((a, b) => a.mtime - b.mtime);
if (items.length !== sceneNames.length) {
  throw new Error(`expected ${sceneNames.length} webm clips, got ${items.length}`);
}

const intro = join(build, '00-intro.mp4');
const outro = join(build, '99-outro.mp4');
await card(resolve('../work/store/capsules/page-bg-1438x810.png'), 3, intro, false);
await card(resolve('../work/store/capsules/main-616x353.png'), 3, outro, true);

const parts = [intro];
const schedule = [];
let clock = probeDuration(intro);

for (let i = 0; i < items.length; i += 1) {
  const scene = sceneNames[i];
  const source = join(raw, items[i].name);
  const sourceDuration = probeDuration(source);
  const win = windows[scene];
  const t = Math.min(win.t, Math.max(3, sourceDuration - win.start - 0.3));
  const dst = join(build, scene + '.mp4');
  container(source, win.start, t, dst);
  parts.push(dst);
  schedule.push({ scene, start: clock, end: clock + t, line: subtitles[scene] });
  clock += t;
}
parts.push(outro);
const total = clock + probeDuration(outro);

const list = join(build, 'concat.txt');
await writeFile(list, parts.map((p) => `file '${p.replaceAll('\\', '/')}'`).join('\n'), 'utf8');
const silent = join(build, 'silent.mp4');
run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent], 'concat');

function assTime(seconds) {
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Microsoft YaHei,44,&H00EAF6F6,&H00FFFFFF,&H00101010,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,120,120,96,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
const dialogues = schedule
  .map((item) => {
    const start = assTime(item.start + 0.8);
    const end = assTime(item.end - 0.8);
    return `Dialogue: 0,${start},${end},Sub,,0,0,0,,${item.line}`;
  })
  .join('\n');
const assFile = join(build, 'subs.ass');
await writeFile(assFile, assHeader + dialogues + '\n', 'utf8');

const bgm = join(build, 'bgm.wav');
run(
  [
    '-f', 'lavfi', '-i', `sine=frequency=55:duration=${total.toFixed(2)}`,
    '-f', 'lavfi', '-i', `sine=frequency=110:duration=${total.toFixed(2)}`,
    '-f', 'lavfi', '-i', `anoisesrc=duration=${total.toFixed(2)}:color=brown:amplitude=0.03`,
    '-filter_complex',
    '[0:a]volume=0.22[a];[1:a]volume=0.1[b];[2:a]lowpass=f=700[c];[a][b][c]amix=inputs=3:duration=longest,aecho=0.8:0.6:60:0.3,afade=t=in:st=0:d=3,afade=t=out:st=' +
      Math.max(0, total - 6).toFixed(2) +
      ':d=6[out]',
    '-map', '[out]', '-ar', '48000', '-ac', '2', bgm,
  ],
  'bgm',
);

const final = join(root, 'seventh-checksum-trailer-v1-1080p30.mp4');
const assFilterPath = relative(process.cwd(), assFile).replaceAll('\\', '/');
run(
  [
    '-i', silent,
    '-i', bgm,
    '-vf', 'ass=' + assFilterPath,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart', final,
  ],
  'final mux',
);

const size = (await stat(final)).size;

const englishLines = {
  '01-boot': 'Every reading is a heartbeat of the city waking up.',
  '02-street': 'Measure first. Conclude later.',
  '03-panel': 'Not watching videos — measuring conclusions yourself.',
  '04-lesson-ad06': 'Build a breathing desk pet from scratch.',
  '05-lesson-ad18': 'Every judgement is written into your archive.',
};
const enDialogues = schedule
  .map((item) => {
    const start = assTime(item.start + 0.8);
    const end = assTime(item.end - 0.8);
    return `Dialogue: 0,${start},${end},Sub,,0,0,0,,${englishLines[item.scene]}`;
  })
  .join('\n');
const enAss = join(build, 'subs-en.ass');
await writeFile(enAss, assHeader + enDialogues + '\n', 'utf8');
const finalEn = join(root, 'seventh-checksum-trailer-v1-en-1080p30.mp4');
run(
  [
    '-i', silent,
    '-i', bgm,
    '-vf', 'ass=' + relative(process.cwd(), enAss).replaceAll('\\', '/'),
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart', finalEn,
  ],
  'final mux en',
);

const report = {
  final,
  finalEn,
  seconds: Number(total.toFixed(2)),
  sizeMB: Math.round(size / 1024 / 1024),
  schedule,
  note: 'v1 draft: burned CN/EN subtitles, procedural ambient bed, no narration',
};
await writeFile(join(root, 'build-report-v1.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ final, seconds: report.seconds, sizeMB: report.sizeMB, lines: schedule.length }));
