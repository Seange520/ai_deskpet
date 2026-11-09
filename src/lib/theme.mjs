/** 界面主题：夜航深青（默认）/ 浅色纸张 / 二次元紫粉。 */
export const THEMES = [
  { id: 'deep', label: '夜航深青', hint: '控制台质感，与大世界夜景最协调' },
  { id: 'light', label: '浅色纸张', hint: '课堂投影更清晰，白天阅读更轻' },
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
  return 'deep';
}

export function applyTheme(id) {
  const next = THEMES.some((t) => t.id === id) ? id : 'deep';
  if (next === 'deep') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
}

export function saveTheme(id) {
  const next = THEMES.some((t) => t.id === id) ? id : 'deep';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
  return next;
}
