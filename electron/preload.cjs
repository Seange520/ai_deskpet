const { contextBridge } = require('electron');

// 只暴露只读的平台信息；存档仍走 localStorage，与 Web/Demo 完全一致。
contextBridge.exposeInMainWorld('sparkmateDesktop', {
  platform: process.platform,
  desktop: true,
});
