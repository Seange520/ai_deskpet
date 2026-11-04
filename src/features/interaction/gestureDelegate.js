// Only report GPU after the recognizer has actually initialized successfully.
export async function createAdaptiveRecognizer(create, preferGPU) {
  if (preferGPU) {
    try {
      return { recognizer: await create('GPU'), delegate: 'GPU', fallback: false };
    } catch {
      return { recognizer: await create('CPU'), delegate: 'CPU', fallback: true };
    }
  }
  return { recognizer: await create('CPU'), delegate: 'CPU', fallback: false };
}
