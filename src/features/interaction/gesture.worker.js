import { GestureRecognizer } from '@mediapipe/tasks-vision';
import loaderURL from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url';
import binaryURL from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url';

let recognizer;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      recognizer = await GestureRecognizer.createFromOptions(
        {
          wasmLoaderPath: new URL(loaderURL, self.location.href).href,
          wasmBinaryPath: new URL(binaryURL, self.location.href).href,
        },
        {
          baseOptions: { modelAssetPath: data.modelURL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
          cannedGesturesClassifierOptions: {
            categoryAllowlist: ['Open_Palm', 'Closed_Fist'],
            scoreThreshold: 0.75,
          },
        },
      );
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame') {
      const result = recognizer.recognizeForVideo(data.bitmap, data.timestamp);
      const category = result.gestures?.[0]?.[0];
      self.postMessage({
        type: 'result',
        category: category?.categoryName || '',
        score: category?.score || 0,
      });
    }
  } catch {
    self.postMessage({ type: 'error' });
  } finally {
    data.bitmap?.close();
  }
};
