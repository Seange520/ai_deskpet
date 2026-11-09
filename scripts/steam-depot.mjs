import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  STEAM_APP_ID_ENV,
  STEAM_DEPOT_ID_ENV,
  buildAppVdf,
  buildDepotVdf,
  summarizeDepot,
  validateSteamConfig,
} from '../src/platform/steamDepot.mjs';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a === name || a.startsWith(name + '='));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : process.argv[process.argv.indexOf(hit) + 1];
};

const contentDir = resolve(
  arg('--content', process.env.SPARKMATE_DESKTOP_OUT || '../work/deliverables/desktop/TheSeventhChecksum-win32-x64'),
);
const outDir = resolve(arg('--out', '../work/steam/staging'));
const dryRun = process.argv.includes('--dry-run');
const appId = arg('--app', process.env[STEAM_APP_ID_ENV] || '');
const depotId = arg('--depot', process.env[STEAM_DEPOT_ID_ENV] || '');

const check = validateSteamConfig({ appId, depotId, contentDir });
if (!existsSync(join(contentDir, 'TheSeventhChecksum.exe'))) {
  check.errors.push('contentDir 中没有 TheSeventhChecksum.exe：' + contentDir);
}

if (!check.ok) {
  console.error('[steam-depot] 配置不完整：');
  for (const e of check.errors) console.error(' - ' + e);
  console.error(
    '\n用法：node scripts/steam-depot.mjs --app=<AppID> --depot=<DepotID> [--content=<exe目录>] [--out=<staging目录>] [--dry-run]',
  );
  process.exitCode = 1;
} else {
  console.log('[steam-depot] 配置通过：AppID=' + appId + ' DepotID=' + depotId);
  const stagingContent = join(outDir, 'content');
  const depotVdfPath = join(outDir, 'scripts', `depot_build_${depotId}.vdf`);
  const appVdfPath = join(outDir, 'scripts', 'app_build.vdf');

  if (dryRun) {
    console.log('[steam-depot] --dry-run：跳过复制与写盘。');
    console.log(JSON.stringify({ contentDir, stagingContent, appVdfPath, depotVdfPath }, null, 2));
    process.exit(0);
  }

  rmSync(stagingContent, { recursive: true, force: true });
  mkdirSync(join(outDir, 'scripts'), { recursive: true });
  mkdirSync(join(outDir, 'output'), { recursive: true });
  console.log('[1/3] 复制构建产物 → ' + stagingContent);
  cpSync(contentDir, stagingContent, { recursive: true });

  const files = [];
  const walk = (dir, prefix = '') => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const rel = prefix ? prefix + '/' + name : name;
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs, rel);
      else files.push({ path: rel, bytes: st.size });
    }
  };
  walk(stagingContent);
  const bytes = files.reduce((n, f) => n + f.bytes, 0);

  console.log('[2/3] 生成 VDF');
  writeFileSync(depotVdfPath, buildDepotVdf({ depotId, contentDir: stagingContent }), 'utf8');
  writeFileSync(
    appVdfPath,
    buildAppVdf({ appId, depotId, contentDir: stagingContent, depotVdfPath }),
    'utf8',
  );

  console.log('[3/3] 写入清单');
  writeFileSync(
    join(outDir, 'depot-manifest.json'),
    JSON.stringify(
      {
        ...summarizeDepot({ appId, depotId, contentDir: stagingContent, files: files.length, bytes }),
        appVdfPath,
        depotVdfPath,
        largest: files.sort((a, b) => b.bytes - a.bytes).slice(0, 5),
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log('\n完成。上传命令（需先 `steamcmd +login <你的账号> +quit` 完成一次登录）：');
  console.log(`  steamcmd +login <account> +run_app_build "${appVdfPath}" +quit`);
  console.log('上传后在 Steamworks → Builds 里设为 default 分支并 Preview。');
}
