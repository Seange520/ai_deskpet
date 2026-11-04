import http from 'node:http';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

export async function startVirtualEsp32({
  light = 300,
  port = 8765,
  bridge = true,
  samples = Infinity,
  output = process.stdout,
} = {}) {
  const clients = new Set();
  let currentLight = light,
    timer,
    count = 0,
    closing,
    terminal;
  const allowedOrigin = (origin) =>
    !origin ||
    /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ||
    ['https://www.seange.cn', 'https://seange.cn'].includes(origin);
  const server = bridge
    ? http.createServer((req, res) => {
        const origin = req.headers.origin;
        if (!allowedOrigin(origin)) {
          res.writeHead(403).end();
          return;
        }
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
        if (req.method !== 'GET') {
          res.writeHead(405).end();
          return;
        }
        if (req.url === '/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ virtual: true, light: currentLight }));
          return;
        }
        if (req.url !== '/stream') {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        res.write(JSON.stringify({ light: currentLight }) + '\n');
        clients.add(res);
        res.on('close', () => clients.delete(res));
      })
    : null;
  if (server)
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
  const handle = {
    port: server?.address().port ?? null,
    setLight(value) {
      if (!Number.isFinite(value) || value < 0)
        throw new Error('light must be a non-negative number');
      currentLight = value;
    },
    close() {
      if (closing) return closing;
      clearInterval(timer);
      terminal?.close();
      for (const res of clients) res.end();
      clients.clear();
      closing = server ? new Promise((resolve) => server.close(resolve)) : Promise.resolve();
      return closing;
    },
    useKeyboard(input = process.stdin) {
      const command = (text) => {
        const value = text.trim().toLowerCase();
        if (value === 'd') handle.setLight(50);
        else if (value === 'b') handle.setLight(300);
        else if (value === 'q') void handle.close();
        else if (value !== '' && Number.isFinite(Number(value))) handle.setLight(Number(value));
      };
      terminal = readline.createInterface({ input });
      terminal.on('line', (text) => {
        try {
          command(text);
        } catch {
          process.stderr.write('Invalid light value.\n');
        }
      });
    },
  };
  const emit = () => {
    const line = JSON.stringify({ light: currentLight }) + '\n';
    output.write(line);
    for (const res of clients) {
      if (!res.write(line)) {
        res.destroy();
        clients.delete(res);
      }
    }
    if (++count >= samples) void handle.close();
  };
  timer = setInterval(emit, 1000);
  emit();
  return handle;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const number = (name, fallback) =>
    args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback;
  try {
    const light = args.includes('--dark') ? 50 : number('--light', 300);
    const port = number('--port', 8765),
      samples = number('--samples', Infinity);
    if (
      !Number.isFinite(light) ||
      light < 0 ||
      !Number.isInteger(port) ||
      port < 0 ||
      port > 65535 ||
      !(samples > 0)
    )
      throw Error('Invalid arguments');
    const device = await startVirtualEsp32({
      light,
      port,
      samples,
      bridge: !args.includes('--no-bridge'),
    });
    if (samples === Infinity) device.useKeyboard();
    process.stderr.write(
      `Virtual ESP32 ${device.port ? 'http://127.0.0.1:' + device.port : 'stdout'} | d + Enter: dark; b + Enter: bright; q + Enter: quit\n`,
    );
    const quit = () => {
      void device.close();
    };
    process.once('SIGINT', quit);
    process.once('SIGTERM', quit);
  } catch (error) {
    process.stderr.write(`Virtual ESP32 failed: ${error.code || error.message}\n`);
    process.exitCode = 1;
  }
}
