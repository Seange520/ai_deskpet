import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetryDecoder } from '../src/features/hardware/serialConnection.js';
import { useHardwareTelemetry } from '../src/store/useHardwareTelemetry.js';
import { usePetState } from '../src/store/usePetState.js';

test('decoder accepts sound-only and mixed frames while preserving legacy light and temperature', () => {
  const frames = [];
  const invalid = [];
  const parser = createTelemetryDecoder(
    (frame) => frames.push(frame),
    (error) => invalid.push(error),
  );
  const encoder = new TextEncoder();
  parser.push(encoder.encode('{"light":50,"temp":26}\r\n{"sou'));
  parser.push(encoder.encode('nd":78}\n{"light":300,"sound":2}\n'));
  parser.push(encoder.encode('{"sound":"bad"}\n{"light":1,"sound":null}\n{"temp":26}'));
  parser.finish();
  assert.deepEqual(
    frames.map(({ receivedAt, ...frame }) => frame),
    [{ light: 50, temp: 26 }, { sound: 78 }, { light: 300, temp: null, sound: 2 }],
  );
  assert.equal(invalid.length, 3);
});

test('telemetry clamps samples and publishes only changed normalized values', () => {
  const telemetry = useHardwareTelemetry.getState();
  const samples = [];
  const off = useHardwareTelemetry.subscribe(({ lightLevel, soundLevel, isConnected }) =>
    samples.push([lightLevel, soundLevel, isConnected]),
  );
  try {
    telemetry.setConnection(true);
    telemetry.ingest({ light: -20, sound: 0 });
    telemetry.ingest({ light: -10, sound: 0 });
    telemetry.ingest({ light: 900, sound: -20 });
    telemetry.setSoundLevel(Number.NaN);
    telemetry.setConnection(false);
    assert.deepEqual(samples, [
      [100, 0, true],
      [0, 0, true],
      [100, 0, true],
      [100, 0, false],
    ]);
  } finally {
    off();
    telemetry.setConnection(false);
  }
});

test('light preempts a sound reaction and disconnect clears sensor state', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const telemetry = useHardwareTelemetry.getState();
  const status = () => usePetState.getState().status;
  telemetry.setConnection(true);
  telemetry.ingest({ light: 100, sound: 24 });
  assert.equal(status(), 'idle');
  telemetry.setSoundLevel(49);
  assert.equal(status(), 'reacting');
  telemetry.setSoundLevel(5);
  context.mock.timers.tick(450);
  assert.equal(status(), 'idle');
  telemetry.setSoundLevel(80);
  telemetry.setLightLevel(19);
  telemetry.setSoundLevel(5);
  context.mock.timers.tick(450);
  assert.equal(status(), 'sleeping');
  telemetry.setLightLevel(20);
  assert.equal(status(), 'idle');
  telemetry.setSoundLevel(60);
  assert.equal(status(), 'reacting');
  telemetry.setConnection(false);
  context.mock.timers.tick(450);
  assert.equal(status(), 'idle');
  assert.equal(useHardwareTelemetry.getState().soundLevel, 0);
});
