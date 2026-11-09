import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, join, relative } from 'node:path';

const require = createRequire('D:/deepseek_file/ai_deskpet/package.json');
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const root = resolve('D:/deepseek_file/work/store/trailer');
const raw = join(root, 'raw-v2');
const build = join(root, 'build-v3');
const cards = join(root, 'cards');
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });

const report = JSON.parse(readFileSync(join(raw, 'marks.json'), 'utf8'));
const markByScene = Object.fromEntries(report.marks.map((m) => [m.scene, m.mark]));
const clipByScene = Object.fromEntries(
  report.clips.filter((c) => c.path).map((c) => [c.name, c.path]),
);

function run(args, label) {
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-y', ...args], { stdio: 'pipe' });
  } catch (error) {
    const stderr = String(error.stderr || '');
    throw new Error(`${label} failed: ${stderr.split('\n').slice(-12).join('\n')}`);
  }
}

function probeDuration(file) {
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' });
  } catch (error) {
    const m = String(error.stderr || '').match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 0;
}

// scene, subtitle CN, subtitle EN, desired length
const scenes = [
  { scene: 's1-street', cn: '先测量，再得出结论。', en: 'Measure first. Conclude later.', t: 5.6, delta: 3.1 },
  { scene: 's3-panel', cn: '不是看视频，是亲手把结论测出来。', en: 'Not watching — measuring the conclusion yourself.', t: 6.6 },
  { scene: 's4-ad06', cn: '从零造一台会呼吸的桌宠。', en: 'Build a breathing desk pet from scratch.', t: 7.4 },
  { scene: 's5-ic', cn: '专业支线：芯片入门。', en: 'The silicon path.', t: 6.4 },
  { scene: 's6-map', cn: '下一座岛，下一节课。', en: 'Next island. Next lesson.', t: 10 },
];
const TRANSITION = 0.5;

const parts = [];
const schedule = [];

function card(image, t, name, fadeOut = true) {
  const dst = join(build, name + '.mp4');
  const fade = `fade=t=in:st=0:d=0.6${fadeOut ? `,fade=t=out:st=${(t - 0.6).toFixed(2)}:d=0.6` : ''}`;
  run(
    [
      '-loop', '1', '-i', image,
      '-t', String(t),
      '-vf', `scale=1920:1080,fps=30,format=yuv420p,${fade}`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-an', dst,
    ],
    'card ' + name,
  );
  return dst;
}

// intro: landing key art for 3.6s
const intro = card(join('D:/deepseek_file/work/store/capsules/page-bg-1438x810.png'), 2.6, '00-intro');
parts.push(intro);
schedule.push({ kind: 'card', file: intro, t: 2.6 });

for (const item of scenes) {
  const source = clipByScene[item.scene];
  const mark = markByScene[item.scene];
  if (!source || mark == null) throw new Error('missing clip/mark ' + item.scene);
  const start = Math.max(0, mark - 0.5 + (item.delta || 0));
  const sourceDur = probeDuration(source);
  const t = Math.min(item.t, Math.max(2.5, sourceDur - start - 0.2));
  const dst = join(build, item.scene + '.mp4');
  const fadeIn = 'fade=t=in:st=0:d=0.28';
  const fadeOut = `fade=t=out:st=${Math.max(0, t - 0.32).toFixed(2)}:d=0.32`;
  run(
    [
      '-ss', String(start), '-i', source, '-t', String(t),
      '-vf',
      `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p,eq=contrast=1.05:saturation=0.94:gamma=0.98,vignette=angle=PI/5,noise=alls=7:allf=t+u,${fadeIn},${fadeOut}`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30', '-an', dst,
    ],
    'transcode ' + item.scene,
  );
  parts.push(dst);
  schedule.push({ kind: 'scene', scene: item.scene, file: dst, t, cn: item.cn, en: item.en });
}

const title = card(join(cards, 'title.png'), 3.8, '90-title');
parts.push(title);
schedule.push({ kind: 'card', file: title, t: 3.8 });

const cta = card(join(cards, 'cta.png'), 4.0, '99-cta');
parts.push(cta);
schedule.push({ kind: 'card', file: cta, t: 4.0 });

// hard-cut concat via demuxer; every segment already fades from/to black
const silent = join(build, 'silent.mp4');
const listFile = join(build, 'concat.txt');
writeFileSync(listFile, parts.map((p) => `file '${p.replaceAll('\\', '/')}'`).join('\n') + '\n', 'utf8');
run(
  ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-an', silent],
  'concat',
);
const videoTotal = probeDuration(silent);

// subtitle schedule (hard cuts: each segment keeps its full length)
const cues = [];
let clock = 0;
for (const item of schedule) {
  const start = clock;
  const end = clock + item.t;
  if (item.kind === 'scene') cues.push({ start, end, cn: item.cn, en: item.en });
  clock = end;
}

function assTime(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100));
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
Style: Sub,Microsoft YaHei,46,&H00EAF6F6,&H00FFFFFF,&H00101010,&H8C000000,0,0,0,0,100,100,1,0,1,2,1,2,140,140,118,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

function buildAss(lang) {
  const lines = cues
    .map((c) => {
      const start = assTime(c.start + 0.45);
      const end = assTime(c.end - 0.35);
      return `Dialogue: 0,${start},${end},Sub,,0,0,0,,${c[lang]}`;
    })
    .join('\n');
  return assHeader + lines + '\n';
}

const assCn = join(build, 'subs-cn.ass');
const assEn = join(build, 'subs-en.ass');
writeFileSync(assCn, buildAss('cn'), 'utf8');
writeFileSync(assEn, buildAss('en'), 'utf8');

// BGM: reuse v1 bed if present, otherwise synthesize; add intro hit + outro resolve
let bgm = join(root, 'build', 'bgm.wav');
if (probeDuration(bgm) < videoTotal) {
  const synthesized = join(build, 'bgm.wav');
  run(
    [
      '-f', 'lavfi', '-i', `sine=frequency=55:duration=${videoTotal.toFixed(2)}`,
      '-f', 'lavfi', '-i', `sine=frequency=110:duration=${videoTotal.toFixed(2)}`,
      '-f', 'lavfi', '-i', `anoisesrc=duration=${videoTotal.toFixed(2)}:color=brown:amplitude=0.035`,
      '-filter_complex',
      `[0:a]volume=0.26[a];[1:a]volume=0.12[b];[2:a]lowpass=f=820[c];` +
        `[a][b][c]amix=inputs=3:duration=longest,aecho=0.85:0.6:70:0.32,` +
        `afade=t=in:st=0:d=2.5,afade=t=out:st=${(videoTotal - 5).toFixed(2)}:d=5[out]`,
      '-map', '[out]', '-ar', '48000', '-ac', '2', synthesized,
    ],
    'bgm synth',
  );
  bgm = synthesized;
}

const mixedBed = join(build, 'bed.wav');
run(
  [
    '-i', bgm,
    '-af',
    `atrim=0:${videoTotal.toFixed(2)},asetpts=N/SR/TB,` +
      `afade=t=out:st=${(videoTotal - 4).toFixed(2)}:d=4,` +
      'loudnorm=I=-19:TP=-3:LRA=9',
    '-ar', '48000', '-ac', '2', mixedBed,
  ],
  'bed',
);

// SFX: whoosh at every scene/title cut, low hit entering title.
const cutTimes = [];
{
  let clock = 0;
  for (const item of schedule) {
    if (clock > 0.1) cutTimes.push({ at: Math.max(0, clock - 0.18), kind: item.kind });
    clock += item.t;
  }
}
const whoosh = join(build, 'sfx-whoosh.wav');
run(
  ['-f', 'lavfi', '-i', 'anoisesrc=duration=0.55:color=white:amplitude=0.5',
   '-af', 'highpass=f=700,lowpass=f=7000,afade=t=in:st=0:d=0.06,afade=t=out:st=0.2:d=0.35,volume=0.5',
   '-ar', '48000', '-ac', '2', whoosh],
  'whoosh',
);
const boom = join(build, 'sfx-boom.wav');
run(
  ['-f', 'lavfi', '-i', 'sine=frequency=58:duration=1.4',
   '-af', 'afade=t=in:st=0:d=0.02,afade=t=out:st=0.25:d=1.1,volume=0.55',
   '-ar', '48000', '-ac', '2', boom],
  'boom',
);
const titleStart = (() => {
  let clock = 0;
  for (const item of schedule) {
    if (item.kind === 'card' && item.file.includes('90-title')) return clock;
    clock += item.t;
  }
  return clock;
})();
const inputs = ['-i', mixedBed, '-i', whoosh, '-i', boom];
const filters = [];
const mixRefs = ['[0:a]'];
const n = cutTimes.length;
filters.push('[1:a]asplit=' + n + cutTimes.map((_, i) => '[w' + i + ']').join(''));
cutTimes.forEach((c, i) => {
  const ms = Math.round(c.at * 1000);
  filters.push('[w' + i + ']adelay=' + ms + '|' + ms + '[wd' + i + ']');
  mixRefs.push('[wd' + i + ']');
});
if (titleStart > 0.1) {
  const ms = Math.round((titleStart - 0.05) * 1000);
  filters.push('[2:a]adelay=' + ms + '|' + ms + '[bd]');
  mixRefs.push('[bd]');
}
filters.push(mixRefs.join('') + 'amix=inputs=' + mixRefs.length + ':duration=first,loudnorm=I=-18:TP=-2:LRA=9[out]');
const finalBed = join(build, 'bed-mixed.wav');
run(
  [...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', finalBed],
  'sfx mix',
);

function mux(subFile, dst, label) {
  run(
    [
      '-i', silent, '-i', finalBed,
      '-vf', 'ass=' + relative(process.cwd(), subFile).replaceAll('\\', '/'),
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest', '-movflags', '+faststart', dst,
    ],
    'mux ' + label,
  );
}

const final = join(root, 'seventh-checksum-trailer-v3-1080p30.mp4');
const finalEn = join(root, 'seventh-checksum-trailer-v3-en-1080p30.mp4');
mux(assCn, final, 'cn');
mux(assEn, finalEn, 'en');

const size = statSync(final).size;
const reportOut = {
  final,
  finalEn,
  seconds: Number(videoTotal.toFixed(2)),
  sizeMB: Math.round(size / 1024 / 1024),
  resolution: '1920x1080',
  fps: 30,
  scenes: schedule.map((s) => ({ ...s, file: relative(root, s.file) })),
  subtitles: cues,
  note: 'v3: v2 recapture + cinematic grade (contrast/vignette/grain), tighter intro/title timing, transition SFX + low hit; CN/EN burned subtitles.',
};
writeFileSync(join(root, 'build-report-v3.json'), JSON.stringify(reportOut, null, 2), 'utf8');
console.log(JSON.stringify({ final, finalEn, seconds: reportOut.seconds, sizeMB: reportOut.sizeMB }));
