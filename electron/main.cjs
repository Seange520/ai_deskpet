const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'dist', 'index.html');
const SMOKE = process.argv.includes('--smoke-test');
const smokeOut = process.env.SPARKMATE_SMOKE_OUT || '';

app.setName('The Seventh Checksum');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');

async function runSmoke(win) {
  const target = smokeOut || path.join(process.cwd(), 'smoke.json');
  const payload = { ok: false };
  try {
    await new Promise((resolve) => setTimeout(resolve, 3200));
    payload.ui = await win.webContents.executeJavaScript(`(() => ({
      title: document.title,
      root: Boolean(document.querySelector('#root')),
      canvases: document.querySelectorAll('canvas').length,
      bootElements: document.querySelectorAll('[data-boot], [data-boot-enter]').length,
      desktopFlag: Boolean(window.sparkmateDesktop && window.sparkmateDesktop.desktop),
      platform: window.sparkmateDesktop ? window.sparkmateDesktop.platform : null,
      bodyText: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 1200),
    }))()`);
    const image = await win.webContents.capturePage();
    const pngPath = target.replace(/\.json$/i, '') + '.png';
    fs.writeFileSync(pngPath, image.toPNG());
    payload.png = pngPath;
    payload.ok = true;
  } catch (error) {
    payload.error = String(error);
  }
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf8');
  app.exit(payload.ok ? 0 : 1);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#061318',
    title: '第七校验 · The Seventh Checksum',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.once('ready-to-show', () => {
    win.show();
  });
  if (SMOKE) {
    win.webContents.once('did-finish-load', () => runSmoke(win));
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadFile(indexPath).catch((error) => {
    win.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          '<h1>构建产物缺失</h1><p>请先运行 npm run build 生成 dist/ 后重试。</p><pre>' +
            String(error) +
            '</pre>',
        ),
    );
  });
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
