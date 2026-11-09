/** 界面主题：浅色纸张（默认·校验册页风）/ 夜航深青 / 二次元紫粉。 */
export const THEMES = [
  { id: 'deep', label: '夜航深青', hint: '控制台质感，与大世界夜景最协调' },
  { id: 'light', label: '浅色纸张（默认）', hint: '纸、墨、黄铜：与小说和校验册页同一气质' },
  { id: 'anime', label: '二次元紫粉', hint: '动漫游戏审美，桌宠与角色更突出' },
];

const KEY = 'sparkmate.ui.theme.v1';

export function readTheme() {
  try {
    const value = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === value)) return value;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function applyTheme(id) {
  const next = THEMES.some((t) => t.id === id) ? id : 'light';
  if (next === 'deep') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
}

export function saveTheme(id) {
  const next = THEMES.some((t) => t.id === id) ? id : 'light';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
  return next;
}
