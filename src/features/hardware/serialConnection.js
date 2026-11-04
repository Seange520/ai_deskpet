const MAX_LINE_LENGTH = 8192;

// Serial chunks need not match JSON lines, including UTF-8 and CRLF boundaries.
export function createTelemetryDecoder(onData, onInvalid) {
  const decoder = new TextDecoder();
  let pending = '';
  let discarding = false;
  function line(text) {
    if (!text.trim()) return;
    try {
      const data = JSON.parse(text);
      if (
        !data ||
        Array.isArray(data) ||
        (Object.hasOwn(data, 'temp') && !Number.isFinite(data.temp)) ||
        !Number.isFinite(data.light)
      )
        throw new Error('schema');
      onData({ temp: data.temp ?? null, light: data.light, receivedAt: Date.now() });
    } catch {
      onInvalid('已忽略无效数据，请确认设备发送包含 light 数值、可选 temp 数值的 JSON 行。');
    }
  }
  function consume(text) {
    let cursor = 0;
    while (cursor < text.length) {
      const end = text.indexOf('\n', cursor);
      const part = text.slice(cursor, end < 0 ? text.length : end);
      if (!discarding) {
        if (pending.length + part.length > MAX_LINE_LENGTH) {
          pending = '';
          discarding = true;
          onInvalid('已忽略过长数据行，请将每行限制在 8192 个字符以内。');
        } else pending += part;
      }
      if (end < 0) return;
      if (!discarding) line(pending);
      pending = '';
      discarding = false;
      cursor = end + 1;
    }
  }
  return {
    push: (bytes) => consume(decoder.decode(bytes, { stream: true })),
    finish() {
      consume(decoder.decode());
      if (!discarding) line(pending);
      pending = '';
      discarding = false;
    },
  };
}

export function getBrowserSerial() {
  try {
    if (!globalThis.isSecureContext || typeof navigator === 'undefined') return null;
    const serial = navigator.serial;
    return typeof serial?.requestPort === 'function' ? serial : null;
  } catch {
    return null;
  }
}

function connectionError(error) {
  if (error?.name === 'NotFoundError') return '已取消串口选择或未找到设备，可再次连接。';
  if (['NotAllowedError', 'SecurityError'].includes(error?.name))
    return '未获得串口授权，请检查浏览器权限与安全连接。';
  return '无法打开串口，请检查 USB 连接、波特率，以及串口是否被其他程序占用。';
}

// Inject a Serial-compatible provider for virtual ports/tests; production uses navigator.serial.
export function createSerialConnection({
  getSerial = getBrowserSerial,
  onState,
  onData,
  onInvalid,
}) {
  let active = null;
  let generation = 0;
  const live = (session) => active === session && !session.stopped;
  const update = (session, state) => {
    if (live(session)) onState(state);
  };
  function closePort(session) {
    if (!session.opened) return Promise.resolve();
    if (!session.closing)
      session.closing = Promise.resolve()
        .then(() => session.port.close())
        .catch(() => {
          session.closeError = true;
        });
    return session.closing;
  }
  async function release(session) {
    session.unlisten?.();
    if (session.reader) {
      try {
        session.reader.releaseLock();
      } catch {
        /* already released */
      }
      session.reader = null;
    }
    await closePort(session);
  }
  async function stop(session, message = '已断开硬件连接。', status = 'idle') {
    if (!live(session)) return;
    session.stopped = true;
    active = null;
    onState({
      status: 'disconnecting',
      hardwareData: null,
      notice: '',
      message: '正在断开硬件连接…',
    });
    session.unlisten?.();
    session.port?.cancelOpen?.();
    try {
      await session.reader?.cancel();
    } catch {
      /* unplugged stream */
    }
    if (session.readTask) await session.readTask;
    else if (session.opened) await release(session);
    // A pending chooser/open is closed by start's finally if it resolves after cancellation.
    if (!active && generation === session.id)
      onState({
        status: session.closeError ? 'error' : status,
        hardwareData: null,
        message: session.closeError ? '串口关闭失败，请重新插拔设备后再连接。' : message,
      });
  }
  async function read(session) {
    const parser = createTelemetryDecoder(
      (data) => {
        if (live(session)) onData(data);
      },
      (message) => {
        if (live(session)) onInvalid(message);
      },
    );
    let message = '串口数据流已结束，请重新连接。';
    let status = 'idle';
    try {
      while (live(session)) {
        const { value, done } = await session.reader.read();
        if (!live(session)) break;
        if (done) {
          parser.finish();
          break;
        }
        if (value) parser.push(value);
      }
    } catch {
      message = '串口读取中断，请检查设备连接后重试。';
      status = 'error';
    } finally {
      await release(session);
      if (live(session)) {
        active = null;
        onState({
          status: session.closeError ? 'error' : status,
          hardwareData: null,
          notice: '',
          message: session.closeError ? '串口关闭失败，请重新插拔设备后再连接。' : message,
        });
      }
    }
  }
  async function start(session, serial, baudRate) {
    try {
      // requestPort is invoked synchronously from the click, before any await.
      session.port = await serial.requestPort();
      if (!live(session)) return false;
      update(session, { status: 'connecting', message: '正在打开串口…' });
      await session.port.open({ baudRate });
      session.opened = true;
      if (!live(session)) return false;
      if (!session.port.readable) throw new Error('No readable stream');
      session.reader = session.port.readable.getReader();
      const unplugged = (event) => {
        if ((event.port || event.target) === session.port)
          void stop(session, '设备已断开，请重新连接。', 'error');
      };
      serial.addEventListener?.('disconnect', unplugged);
      session.unlisten = () => {
        serial.removeEventListener?.('disconnect', unplugged);
        session.unlisten = null;
      };
      update(session, { status: 'connected', message: '串口已连接，等待设备数据…' });
      session.readTask = read(session);
      return true;
    } catch (error) {
      update(session, { status: 'error', hardwareData: null, message: connectionError(error) });
      return false;
    } finally {
      if (!session.readTask) {
        await release(session);
        if (active === session) active = null;
      }
    }
  }
  return {
    connect({ baudRate = 115200 } = {}) {
      if (active) return Promise.resolve(false);
      const id = ++generation;
      let serial;
      try {
        serial = getSerial();
      } catch {
        /* unavailable provider */
      }
      if (!serial) {
        onState({
          status: 'error',
          hardwareData: null,
          message: '当前浏览器或环境不支持硬件连接。',
        });
        return Promise.resolve(false);
      }
      if (!Number.isSafeInteger(baudRate) || baudRate <= 0) {
        onState({ status: 'error', hardwareData: null, message: '波特率无效，请重新选择。' });
        return Promise.resolve(false);
      }
      const session = { id, stopped: false, opened: false, reader: null, port: null };
      active = session;
      onState({
        status: 'requesting',
        hardwareData: null,
        receivedCount: 0,
        invalidLineCount: 0,
        notice: '',
        message: '请选择 USB 串口；取消选择不会影响课程。',
      });
      return start(session, serial, baudRate);
    },
    disconnect() {
      return active ? stop(active) : Promise.resolve();
    },
  };
}
