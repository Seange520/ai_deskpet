export const registry = Object.freeze({
  meter: () => import('./MeterSim.jsx'),
  'series-voltage': () => import('./SeriesVoltageSim.jsx'),
  pwm: () => import('./PwmSim.jsx'),
  'ide-run': () => import('./IdeRunSim.jsx'),
  'i2c-scan': () => import('./I2cScanSim.jsx'),
  'mqtt-publish': () => import('./MqttPublishSim.jsx'),
  'pet-build': () => import('./PetBuildSim.jsx'),
  'power-precheck': () => import('./PowerPrecheckSim.jsx'),
  'expression-frame': () => import('./ExpressionFrameSim.jsx'),
  'motion-tone': () => import('./MotionToneSim.jsx'),
  'state-machine': () => import('./StateMachineSim.jsx'),
  'intent-router': () => import('./IntentRouterSim.jsx'),
  'boundary-guard': () => import('./BoundaryGuardSim.jsx'),
  'memory-recall': () => import('./MemoryRecallSim.jsx'),
  'tone-response': () => import('./ToneResponseSim.jsx'),
  'self-check': () => import('./SelfCheckSim.jsx'),
  'offline-fallback': () => import('./OfflineFallbackSim.jsx'),
  'data-autonomy': () => import('./DataAutonomySim.jsx'),
  'project-brief': () => import('./ProjectBriefSim.jsx'),
  'iteration-steps': () => import('./IterationStepsSim.jsx'),
  'graduation-audit': () => import('./GraduationAuditSim.jsx'),
  'diode-bias': () => import('./DiodeBiasSim.jsx'),
  'mos-switch': () => import('./MosSwitchSim.jsx'),
  'cmos-inverter': () => import('./CmosInverterSim.jsx'),
  'logic-gates': () => import('./LogicGatesSim.jsx'),
});
export const simIds = Object.freeze(Object.keys(registry));
export function getSim(id) {
  return Object.hasOwn(registry, id) ? registry[id] : null;
}

