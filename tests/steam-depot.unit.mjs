import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAppVdf,
  buildDepotVdf,
  quoteVdf,
  summarizeDepot,
  validateSteamConfig,
} from '../src/platform/steamDepot.mjs';

test('quoteVdf 转义引号与反斜杠', () => {
  assert.equal(quoteVdf('a"b\\c'), '"a\\"b\\\\c"');
  assert.equal(quoteVdf(123), '"123"');
});

test('配置校验：正整数 ID 与 contentDir 必填', () => {
  assert.equal(validateSteamConfig({ appId: '123', depotId: '456', contentDir: 'C:/x' }).ok, true);
  const bad = validateSteamConfig({ appId: '0', depotId: 'abc', contentDir: '' });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 3);
  assert.match(bad.errors.join(' '), /AppID/);
  assert.match(bad.errors.join(' '), /DepotID/);
  assert.match(bad.errors.join(' '), /contentDir/);
});

test('app_build.vdf 结构：AppID/BuildOutput/ContentRoot/Depots', () => {
  const vdf = buildAppVdf({
    appId: 123,
    depotId: 456,
    contentDir: 'D:\\build\\content',
    depotVdfPath: 'D:\\build\\scripts\\depot_build_456.vdf',
  });
  assert.match(vdf, /"AppBuild"/);
  assert.match(vdf, /"AppID" "123"/);
  assert.match(vdf, /"BuildOutput" "\.\.\/output\/"/);
  assert.match(vdf, /"ContentRoot" "D:\/build\/content"/);
  assert.match(vdf, /"456" "D:\/build\/scripts\/depot_build_456\.vdf"/);
});

test('depot_build.vdf 结构：DepotID/映射/排除', () => {
  const vdf = buildDepotVdf({ depotId: 456, contentDir: 'D:\\build\\content' });
  assert.match(vdf, /"DepotBuildConfig"/);
  assert.match(vdf, /"DepotID" "456"/);
  assert.match(vdf, /"LocalPath" "\*"/);
  assert.match(vdf, /"recursive" "1"/);
  assert.match(vdf, /"FileExclusion" "\*\.pdb"/);
});

test('summarizeDepot 记录 AppID/Depot/字节数与生成时间', () => {
  const s = summarizeDepot({ appId: 123, depotId: 456, contentDir: 'C:/x', files: 10, bytes: 2048 });
  assert.equal(s.appId, '123');
  assert.equal(s.depotId, '456');
  assert.equal(s.files, 10);
  assert.equal(s.bytes, 2048);
  assert.ok(!Number.isNaN(Date.parse(s.generatedAt)));
});
