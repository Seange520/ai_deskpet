export const vertexShader = `#version 300 es
out vec2 uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const fragmentShader = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform vec2 resolution;
uniform float time;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float n = 0.0, a = 0.55;
  for (int i = 0; i < 3; i++) {
    n += a * noise(p); p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.02 + 7.3; a *= 0.5;
  }
  return n;
}
void main() {
  vec2 p = vec2(uv.x * resolution.x / max(resolution.y, 1.0), uv.y) * 1.8;
  float t = time * 0.085;
  vec2 warp = vec2(fbm(p + vec2(t, -t)), fbm(p + vec2(4.2, 1.7 + t)));
  float cloud = fbm(p + warp * 2.4 + vec2(-t * 0.7, t));
  float curtain = pow(1.0 - abs(sin(p.x * 3.4 + warp.x * 4.8 + cloud * 2.0 - t)), 3.0);
  float veil = smoothstep(0.0, 0.5, uv.y) * (0.35 + 0.65 * cloud);
  vec3 amber = vec3(1.0, 0.788, 0.545); // #FFC98B
  vec3 rose = vec3(0.910, 0.706, 0.784); // #E8B4C8
  vec3 dusk = vec3(0.420, 0.388, 0.596); // #6B6398
  vec3 light = mix(dusk, rose, smoothstep(0.25, 0.8, cloud));
  light = mix(light, amber, smoothstep(0.45, 0.96, cloud + uv.x * 0.18));
  float glow = curtain * veil;
  vec3 base = mix(vec3(0.106, 0.086, 0.149), dusk * 0.42, cloud);
  color = vec4(base + light * (glow * 0.43 + cloud * 0.08), 0.9);
}`;

// Same field in scene-linear HDR space; captured by the Stage post-processing chain.
export const sceneAuroraVertex = `
varying vec2 fieldUv;
void main() { fieldUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;
export const sceneAuroraFragment = fragmentShader
  .replace('#version 300 es', '')
  .replace('in vec2 uv;', 'varying vec2 fieldUv;\n#define uv fieldUv')
  .replace('out vec4 color;', '')
  .replace(
    'color = vec4(base + light * (glow * 0.43 + cloud * 0.08), 0.9);',
    'gl_FragColor = vec4(base * 0.24 + light * (glow * 0.22 + pow(glow, 6.0) * 1.4 + cloud * 0.025), 1.0);',
  );
