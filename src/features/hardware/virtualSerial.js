// A loopback NDJSON bridge, not an OS/USB serial port. Same read lifecycle as Web Serial.
export function createVirtualSerialProvider(port = 8765) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Invalid virtual port');
  return {
    requestPort: async () => {
      const controller = new AbortController();
      let readable = null;
      return {
        get readable() {
          return readable;
        },
        async open() {
          const timer = setTimeout(() => controller.abort(), 5000);
          try {
            const response = await fetch(`http://127.0.0.1:${port}/stream`, {
              signal: controller.signal,
              mode: 'cors',
              cache: 'no-store',
            });
            if (!response.ok || !response.body) throw new Error('Virtual bridge unavailable');
            readable = response.body;
          } finally {
            clearTimeout(timer);
          }
        },
        cancelOpen() {
          controller.abort();
        },
        async close() {
          controller.abort();
        },
      };
    },
  };
}
