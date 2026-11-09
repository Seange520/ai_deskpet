import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateUID } from './uid.mjs';
import {
  IDENTITY_KEY,
  INSTALL_KEY,
  freshProfile,
  restoreProfile,
  nicknameError,
  appearance,
  activityDays,
  deleteArchive,
} from './profile.mjs';
// persist uses a raw identity schema, not the default Zustand envelope.
// No-op null writes preserve corrupt archives and keep deletion final.
export function createIdentityStore(storage, cryptoApi = globalThis.crypto) {
  if (!storage) {
    try {
      storage = globalThis.localStorage;
    } catch {}
  }
  if (!storage)
    storage = {
      getItem: () => null,
      setItem: () => {
        throw Error('storage');
      },
      removeItem: () => {
        throw Error('storage');
      },
    };
  let initial;
  try {
    initial = restoreProfile(storage.getItem(IDENTITY_KEY));
  } catch {
    initial = { profile: null, error: '无法读取本机存储' };
  }
  let pending;
  return create(
    persist(
      (set, get) => ({
        ...initial,
        save(profile, message = '已保存') {
          try {
            storage.setItem(IDENTITY_KEY, JSON.stringify(profile));
            set({ profile, error: '', message });
            return true;
          } catch {
            set({ message: '本机存储不可用，保存失败' });
            return false;
          }
        },
        touch() {
          const p = get().profile;
          if (p)
            get().save(
              {
                ...p,
                activityDays: activityDays(p.activityDays),
                updatedAt: new Date().toISOString(),
              },
              '',
            );
        },
        ensureProfile(birthYear) {
          if (get().profile) return Promise.resolve();
          if (pending) return pending;
          pending = (async () => {
            try {
              if (!cryptoApi?.getRandomValues || !cryptoApi?.randomUUID || !cryptoApi?.subtle)
                throw Error('本机不支持安全随机数，档案不可用');
              if (
                !Number.isInteger(birthYear) ||
                birthYear < 1900 ||
                birthYear > new Date().getFullYear()
              ) {
                set({ message: '请输入有效出生年份' });
                return;
              }
              let install, secret;
              try {
                install = JSON.parse(storage.getItem(INSTALL_KEY));
                secret = Uint8Array.from(atob(install.secret), (c) => c.charCodeAt(0));
                if (
                  install.version !== 1 ||
                  secret.length !== 32 ||
                  !Number.isFinite(Date.parse(install.createdAt))
                )
                  throw Error();
              } catch {
                secret = cryptoApi.getRandomValues(new Uint8Array(32));
                install = {
                  version: 1,
                  secret: btoa(String.fromCharCode(...secret)),
                  createdAt: new Date().toISOString(),
                };
              }
              const uid = await generateUID(secret, cryptoApi);
              storage.setItem(INSTALL_KEY, JSON.stringify(install));
              get().save(freshProfile(uid, birthYear), '档案已生成');
            } catch (e) {
              set({
                message:
                  e.message === '本机不支持安全随机数，档案不可用'
                    ? e.message
                    : '档案生成失败，请检查本机存储',
              });
            }
          })().finally(() => {
            pending = null;
          });
          return pending;
        },
        saveNickname(value) {
          const p = get().profile;
          if (!p) return;
          const error = nicknameError(value, p.nicknameChangedAt);
          if (error) {
            set({ message: error });
            return false;
          }
          return get().save(
            {
              ...p,
              nickname: value.trim(),
              nicknameChangedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            '铭牌已保存',
          );
        },
        saveAppearance(value) {
          const p = get().profile;
          if (p)
            get().save(
              { ...p, appearance: appearance(value), updatedAt: new Date().toISOString() },
              '外观已保存',
            );
        },
        setConsent(key, value) {
          const p = get().profile;
          if (p && ['aiMemory', 'analytics'].includes(key))
            get().save(
              {
                ...p,
                consents: { ...p.consents, [key]: value === true },
                updatedAt: new Date().toISOString(),
              },
              value ? '授权已开启（仅本地记录）' : '授权已撤回',
            );
        },
        recordExport() {
          const p = get().profile;
          if (p)
            get().save(
              {
                ...p,
                lastExportAt: new Date().toISOString(),
                activityDays: activityDays(p.activityDays),
                updatedAt: new Date().toISOString(),
              },
              '档案已导出',
            );
        },
        deleteProfile() {
          try {
            deleteArchive(storage);
            set({ profile: null, error: '', message: '本地档案已删除' });
          } catch {
            set({ message: '删除失败，请检查本机存储' });
          }
        },
      }),
      {
        name: IDENTITY_KEY,
        skipHydration: true,
        storage: {
          getItem: () => null,
          setItem: (_name, value) => {
            if (value.state.profile) {
              try {
                storage.setItem(IDENTITY_KEY, JSON.stringify(value.state.profile));
              } catch {}
            }
          },
          removeItem: () => storage.removeItem(IDENTITY_KEY),
        },
        partialize: (s) => ({ profile: s.profile }),
      },
    ),
  );
}
export const useIdentity = createIdentityStore();
