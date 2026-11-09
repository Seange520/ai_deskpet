export const registry = Object.freeze({
  meter: () => import('./MeterSim.jsx'),
  'series-voltage': () => import('./SeriesVoltageSim.jsx'),
  pwm: () => import('./PwmSim.jsx'),
  'ide-run': () => import('./IdeRunSim.jsx'),
  'i2c-scan': () => import('./I2cScanSim.jsx'),
  'mqtt-publish': () => import('./MqttPublishSim.jsx'),
  'pet-build': () => import('./PetBuildSim.jsx'),
});
export const simIds = Object.freeze(Object.keys(registry));
export function getSim(id) {
  return Object.hasOwn(registry, id) ? registry[id] : null;
}

