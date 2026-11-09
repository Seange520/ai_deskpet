// SteamPipe 配置与 VDF 生成（纯函数，便于单测；不接触网络/账号）。
export const STEAM_APP_ID_ENV = 'SPARKMATE_STEAM_APP_ID';
export const STEAM_DEPOT_ID_ENV = 'SPARKMATE_STEAM_DEPOT_ID';
export const STEAM_BUILD_DESC = 'seventh-checksum win64';

export function quoteVdf(value) {
  return '"' + String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"';
}

export function validateSteamConfig({ appId, depotId, contentDir }) {
  const errors = [];
  const idOk = (v) => /^[1-9]\d{0,9}$/.test(String(v ?? ''));
  if (!idOk(appId)) errors.push('AppID 必须是正整数（先在 Steamworks 创建应用）');
  if (!idOk(depotId)) errors.push('DepotID 必须是正整数（Steamworks → SteamPipe → Depot）');
  if (!contentDir || typeof contentDir !== 'string') errors.push('contentDir 不能为空');
  return { ok: errors.length === 0, errors };
}

export function buildAppVdf({ appId, depotId, contentDir, depotVdfPath, desc = STEAM_BUILD_DESC }) {
  const root = String(contentDir).replaceAll('\\', '/');
  const vdf = String(depotVdfPath).replaceAll('\\', '/');
  return [
    '"AppBuild"',
    '{',
    `\t"AppID" ${quoteVdf(appId)}`,
    `\t"Desc" ${quoteVdf(desc)}`,
    '\t"BuildOutput" "../output/"',
    `\t"ContentRoot" ${quoteVdf(root)}`,
    '\t"SetLive" ""',
    '\t"Preview" "0"',
    '\t"Depots"',
    '\t{',
    `\t\t${quoteVdf(depotId)} ${quoteVdf(vdf)}`,
    '\t}',
    '}',
    '',
  ].join('\n');
}

export function buildDepotVdf({ depotId, contentDir, desc = STEAM_BUILD_DESC }) {
  const root = String(contentDir).replaceAll('\\', '/');
  return [
    '"DepotBuildConfig"',
    '{',
    `\t"DepotID" ${quoteVdf(depotId)}`,
    `\t"ContentRoot" ${quoteVdf(root)}`,
    '\t"FileMapping"',
    '\t{',
    '\t\t"LocalPath" "*"',
    '\t\t"DepotPath" "."',
    '\t\t"recursive" "1"',
    '\t}',
    '\t"FileExclusion" "*.pdb"',
    '\t"FileExclusion" "*.log"',
    `\t"Description" ${quoteVdf(desc)}`,
    '}',
    '',
  ].join('\n');
}

export function summarizeDepot({ appId, depotId, contentDir, files, bytes }) {
  return {
    appId: String(appId),
    depotId: String(depotId),
    contentDir,
    files,
    bytes,
    generatedAt: new Date().toISOString(),
  };
}
