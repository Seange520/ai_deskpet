import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHmac } from 'node:crypto';
import {
  ALPHABET,
  base32,
  hmac,
  deriveUID,
  generateUID,
  validUID,
} from '../src/features/identity/uid.mjs';
import {
  IDENTITY_KEY,
  INSTALL_KEY,
  freshProfile,
  restoreProfile,
  nicknameError,
  ageFlags,
  appearance,
  activityDays,
  exportPayload,
  deleteArchive,
  DAY,
} from '../src/features/identity/profile.mjs';
import {
  PROGRESS_KEYS,
  readProgress,
  resonanceIndex,
  clamp,
  percentile,
} from '../src/features/identity/resonanceIndex.mjs';
const uid = 'M-7F3C2A',
  profile = () => freshProfile(uid, 2000),
  key = 'sparkmate.checksum.profile.v1';
const storage = () => {
  const map = new Map();
  return {
    map,
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
};
test('alphabet has 32 distinct safe symbols', () => {
  assert.equal(new Set(ALPHABET).size, 32);
  assert.doesNotMatch(ALPHABET, /[0O1I]/);
});
test('base32 fixed zero vector', () => assert.equal(base32(new Uint8Array(5)), 'AAAAAAAA'));
test('HMAC matches independent Node implementation', async () => {
  const secret = new Uint8Array(32).fill(7);
  assert.deepEqual(
    Buffer.from(await hmac(secret, 'uuid', webcrypto)),
    createHmac('sha256', secret).update('uuid').digest(),
  );
});
test('UID deterministic', async () => {
  const s = new Uint8Array(32);
  assert.equal(await deriveUID(s, 'a', webcrypto), await deriveUID(s, 'a', webcrypto));
});
test('random UID safe format', async () => {
  for (let i = 0; i < 30; i++)
    assert.ok(validUID(await generateUID(new Uint8Array(32), webcrypto)));
});
test('missing Web Crypto fails closed', async () =>
  assert.rejects(generateUID(new Uint8Array(32), {}), /本机不支持安全随机数/));
test('UID validator rejects excluded glyphs', () => {
  for (const v of ['M-000000', 'M-OOOOOO', 'M-IIIIII', 'M-111111', 'X-ABCDEF'])
    assert.equal(validUID(v), false);
});
test('nickname accepts Chinese and trims', () =>
  assert.equal(nicknameError('  赫菲·学徒_2  '), ''));
test('nickname lengths', () => {
  for (const v of ['甲', '甲'.repeat(17), '  ']) assert.ok(nicknameError(v));
  assert.equal(nicknameError('甲'.repeat(16)), '');
});
test('nickname rejects symbols URLs email', () => {
  for (const v of ['--', 'http://x', 'www.x.cn', 'a@b.cn', '😃😃']) assert.ok(nicknameError(v));
});
test('first set free cooldown boundary', () => {
  assert.equal(nicknameError('学徒', null), '');
  assert.match(nicknameError('学徒', new Date().toISOString()), /30 天/);
  assert.equal(nicknameError('学徒', new Date(Date.now() - 30 * DAY).toISOString()), '');
});
test('age boundaries', () => {
  assert.deepEqual(ageFlags(2013, 2026), { minor: true, minor18: true });
  assert.deepEqual(ageFlags(2012, 2026), { minor: false, minor18: true });
  assert.deepEqual(ageFlags(2008, 2026), { minor: false, minor18: false });
});
test('schema missing fields default with consents off', () => {
  const p = restoreProfile({ version: 1, uid }).profile;
  assert.equal(p.nickname, '赫菲的学徒');
  assert.deepEqual(p.consents, { aiMemory: false, analytics: false });
});
test('bad archive and wrong version recover without writes', () => {
  for (const raw of [
    '{',
    'null',
    '[]',
    JSON.stringify({ version: 2, uid }),
    JSON.stringify({ version: 1, uid, nickname: 'a' }),
  ])
    assert.equal(restoreProfile(raw).profile, null);
  assert.equal(restoreProfile(null).error, '');
});
test('appearance enum fallback', () =>
  assert.deepEqual(appearance({ palette: 'evil', antenna: 'teal' }), {
    palette: 'forge',
    antenna: 'teal',
    decal: 'checksum',
  }));
test('activity keeps rolling 30 local dates and deduplicates', () => {
  const now = new Date(2026, 10, 9, 12),
    days = Array.from({ length: 50 }, (_, i) => {
      const d = new Date(2026, 10, 9 - i);
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');
    });
  const result = activityDays([...days, ...days, 'bad', '2099-01-01'], now);
  assert.equal(result.length, 30);
  assert.equal(result.at(-1), '2026-11-09');
});
test('no identity or progress gives zero', () => assert.equal(resonanceIndex(null).total, 0));
test('knowledge denominator always forty', () =>
  assert.equal(
    resonanceIndex(null, { [key]: { kps: { a: { status: 'mastered', mastery: 0.8 } } } }).items
      .knowledge,
    8,
  ));
test('practice needs measurement and three successful types', () => {
  const k = {
    status: 'mastered',
    mastery: 1,
    evidence: [
      { type: 'measurement', score: 1 },
      { type: 'quiz', score: 1 },
      { type: 'code', score: 1 },
    ],
  };
  assert.equal(resonanceIndex(null, { [key]: { kps: { a: k } } }).items.practice, 200);
  assert.equal(
    resonanceIndex(null, { [key]: { kps: { a: { ...k, evidence: k.evidence.slice(0, 2) } } } })
      .items.practice,
    0,
  );
});
test('all six real story markers', () => {
  const p = Object.fromEntries(
    ['street', 'kickback', 'assembly'].map((n) => [
      'sparkmate.seventh-checksum.' + n + '.v1',
      { completed: true },
    ]),
  );
  p['sparkmate.seventh-checksum.envstory.v1'] = { case: { state: 'closed' } };
  p['sparkmate.seventh-checksum.trust.v1'] = {
    invites: Object.fromEntries(
      ['act1_repair_furnace', 'act2_scrap_torch', 'act3_grave_lamp'].map((id) => [
        id,
        { state: 'done' },
      ]),
    ),
  };
  p['sparkmate.seventh-checksum.raid.v1'] = { meta: { extracted: 1 } };
  assert.equal(resonanceIndex(null, p).items.story, 150);
});
test('resonance clamp nodes and sync', () =>
  assert.equal(
    resonanceIndex(null, {
      'sparkmate.seventh-checksum.resonance.v1': {
        nodes: Object.fromEntries(
          [
            'li_fast_scan',
            'li_precision',
            'li_protocol',
            'gan_embrace',
            'gan_dodge',
            'gan_thermal',
          ].map((id) => [id, true]),
        ),
        sync: 999,
      },
    }).items.resonance,
    100,
  ));
test('creation each contribution and export plus twenty', () => {
  let p = profile();
  p.activityDays = [];
  assert.equal(resonanceIndex(p).items.creation, 0);
  p.appearance = { palette: 'echo', antenna: 'teal', decal: 'lamp' };
  p.nicknameChangedAt = new Date().toISOString();
  assert.equal(resonanceIndex(p).items.creation, 80);
  p.lastExportAt = p.nicknameChangedAt;
  assert.equal(resonanceIndex(p).items.creation, 100);
});
test('connection and total rounding', () => {
  const p = profile();
  assert.equal(resonanceIndex(p).total, 2);
  p.activityDays = Array.from({ length: 30 }, (_, i) => String(i));
  assert.equal(resonanceIndex(p).items.connection, 50);
});
test('clamp all boundaries', () => {
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(9999), 1000);
  assert.equal(clamp(NaN), 0);
});
test('percentile deterministic in zero to ninety nine', () => {
  assert.equal(percentile(uid), percentile(uid));
  assert.ok(percentile(uid) >= 0 && percentile(uid) < 100);
});
test('export payload whitelist excludes install birthYear', () => {
  const p = profile(),
    data = exportPayload(p, { x: 'raw' });
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.identity.uid, uid);
  assert.equal(data.identity.birthYear, undefined);
  assert.deepEqual(data.progress, { x: 'raw' });
});
test('delete removes only two keys byte for byte', () => {
  const s = storage();
  for (const k of [...PROGRESS_KEYS, IDENTITY_KEY, INSTALL_KEY]) s.setItem(k, 'payload:' + k);
  deleteArchive(s);
  assert.equal(s.getItem(IDENTITY_KEY), null);
  assert.equal(s.getItem(INSTALL_KEY), null);
  for (const k of PROGRESS_KEYS) assert.equal(s.getItem(k), 'payload:' + k);
});
test('reading malformed keys never writes', () => {
  const s = storage();
  for (const k of PROGRESS_KEYS) s.setItem(k, '{');
  s.setItem = () => assert.fail('write');
  assert.equal(resonanceIndex(null, readProgress(s)).total, 0);
});
test('store preserves corrupt bytes until explicit regeneration', async () => {
  const { createIdentityStore } = await import('../src/features/identity/identityStore.js');
  const s = storage();
  s.setItem(IDENTITY_KEY, '{bad');
  for (const k of PROGRESS_KEYS) s.setItem(k, 'preserved:' + k);
  const writes = [],
    original = s.setItem;
  s.setItem = (k, v) => {
    writes.push(k);
    return original(k, v);
  };
  const use = createIdentityStore(s, webcrypto);
  assert.equal(s.getItem(IDENTITY_KEY), '{bad');
  assert.equal(use.getState().profile, null);
  await use.getState().ensureProfile(2000);
  const first = use.getState().profile.uid;
  await use.getState().ensureProfile(2000);
  assert.equal(use.getState().profile.uid, first);
  use.getState().saveNickname('本地学徒');
  use.getState().saveAppearance({ palette: 'echo', antenna: 'teal', decal: 'lamp' });
  use.getState().setConsent('aiMemory', true);
  use.getState().setConsent('aiMemory', false);
  use.getState().recordExport();
  for (const k of PROGRESS_KEYS) assert.equal(s.getItem(k), 'preserved:' + k);
  assert.ok(writes.every((k) => k === IDENTITY_KEY || k === INSTALL_KEY));
  use.getState().deleteProfile();
  assert.equal(s.getItem(IDENTITY_KEY), null);
  assert.equal(s.getItem(INSTALL_KEY), null);
});
