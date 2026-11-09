export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function base32(bytes, alphabet = ALPHABET) {
  let bits = 0,
    value = 0,
    result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      const index = (value >>> bits) & 31;
      if (index < alphabet.length) result += alphabet[index];
    }
  }
  if (bits) {
    const index = (value << (5 - bits)) & 31;
    if (index < alphabet.length) result += alphabet[index];
  }
  return result;
}
export const validUID = (uid) => typeof uid === 'string' && /^M-[A-HJ-NP-Z2-9]{6}$/.test(uid);
export async function hmac(secret, uuid, cryptoApi = globalThis.crypto) {
  const key = await cryptoApi.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await cryptoApi.subtle.sign('HMAC', key, new TextEncoder().encode(uuid)));
}
export async function deriveUID(secret, uuid, cryptoApi = globalThis.crypto) {
  const uid = 'M-' + base32(await hmac(secret, uuid, cryptoApi)).slice(0, 6);
  if (!validUID(uid)) throw Error('本机不支持安全随机数，档案不可用');
  return uid;
}
export async function generateUID(secret, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues || !cryptoApi?.randomUUID || !cryptoApi?.subtle)
    throw Error('本机不支持安全随机数，档案不可用');
  return deriveUID(secret, cryptoApi.randomUUID(), cryptoApi);
}
