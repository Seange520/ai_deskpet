import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AlwaysDepth,
  Color,
  DepthTexture,
  DoubleSide,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  MeshNormalMaterial,
  NearestFilter,
  ShaderMaterial,
  Uniform,
  UnsignedIntType,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import {
  BlendFunction,
  BloomEffect,
  Effect,
  EffectAttribute,
  SelectiveBloomEffect,
} from 'postprocessing';
import { MOON_DIRECTION, ISLANDS } from '../space/world';

const maxResolution = 512;
const bloomLayer = 12;
const emissiveNames = new Set([
  'rail-tube',
  'rail-beads',
  'hub-outline',
  'hub-beacon',
  'p5-chip-emitter',
  'p5-circuit-terrain',
  'p5-data-waterfall',
  'p7-jump-shell',
]);

const composite = `
uniform sampler2D reflections;
uniform sampler2D contactAO;
uniform float reflectionMix;
uniform float occlusionMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  if (reflectionMix > 0.0) {
    vec4 reflected = texture2D(reflections, uv);
    color = mix(color, reflected.rgb, clamp(reflected.a * reflectionMix, 0.0, 0.95));
  }
  if (occlusionMix > 0.0) {
    float ao = texture2D(contactAO, uv).r;
    color *= mix(1.0, max(0.42, ao), occlusionMix);
  }
  outputColor = vec4(color, inputColor.a);
}
`;

function configureReflections(gl, scene, camera, buffer) {
  const pass = new SSRPass({ renderer: gl, scene, camera, width: 1, height: 1 });
  pass.opacity = 0.82;
  pass.maxDistance = 66;
  pass.thickness = 0.19;
  pass.distanceAttenuation = false;
  const { ssrMaterial: material } = pass;
  material.depthTest = false;
  material.depthWrite = false;
  material.uniforms.tDepth.value = buffer.depthTexture;
  material.uniforms.tNormal.value = buffer.texture;
  material.uniforms.m2CameraWorld = new Uniform(new Matrix4());
  material.uniforms.m2Moon = new Uniform(new Vector3(...MOON_DIRECTION).normalize());
  material.fragmentShader = material.fragmentShader
    .replace(
      'uniform float thickness;',
      'uniform float thickness; uniform mat4 m2CameraWorld; uniform vec3 m2Moon;',
    )
    .replace('void main(){', 'void main(){ gl_FragColor = vec4(0.0);')
    .replace(
      'vec3 viewNormal=getViewNormal( vUv );',
      `
      vec3 viewNormal = getViewNormal(vUv);
      vec3 worldPosition = (m2CameraWorld * vec4(viewPosition, 1.0)).xyz;
      vec3 worldNormal = mat3(m2CameraWorld) * viewNormal;
      float hub = length(worldPosition.xz);
      float dashboard = length(worldPosition.xz - vec2(${ISLANDS.dashboard.position[0].toFixed(1)}, ${ISLANDS.dashboard.position[2].toFixed(1)}));
      float code = length(worldPosition.xz - vec2(${ISLANDS.code.position[0].toFixed(1)}, ${ISLANDS.code.position[2].toFixed(1)}));
      float rank = length(worldPosition.xz - vec2(${ISLANDS.ranking.position[0].toFixed(1)}, ${ISLANDS.ranking.position[2].toFixed(1)}));
      vec2 hardwareOffset = abs(worldPosition.xz - vec2(${ISLANDS.hardware.position[0].toFixed(1)}, ${ISLANDS.hardware.position[2].toFixed(1)}));
      float hardware = max(hardwareOffset.x, hardwareOffset.y);
      float roundIsland = min(dashboard, min(code, rank));
      float apron = max(1.0 - smoothstep(6.0, 17.0, hub), 1.0 - smoothstep(4.2, 11.0, min(roundIsland, hardware)));
      float valleyFloor = 1.0 - smoothstep(0.025, 0.12, abs(worldPosition.y + 1.16));
      float deck = (1.0 - smoothstep(0.022, 0.07, abs(worldPosition.y - 0.008))) *
        max(1.0 - smoothstep(3.65, 4.22, hub), 1.0 - smoothstep(2.88, 3.21, roundIsland));
      float board = (1.0 - smoothstep(2.38, 2.74, hardware)) *
        smoothstep(0.13, 0.18, worldPosition.y) * (1.0 - smoothstep(0.58, 0.72, worldPosition.y));
      float receiver = max(valleyFloor * apron, max(deck * 0.64, board * 0.28)) *
        smoothstep(0.87, 0.998, worldNormal.y);
      if (receiver <= 0.002) return;
    `,
    )
    .replace('for(float i=0.;i<float(MAX_STEP);i++){', 'for(float i=2.;i<float(MAX_STEP);i+=2.){')
    .replace(
      'gl_FragColor.a=op;',
      `
      vec2 margin = min(uv, 1.0 - uv);
      float screenFade = smoothstep(0.0, 0.075, min(margin.x, margin.y));
      gl_FragColor.a = op * receiver * screenFade;
    `,
    )
    .replace(
      /\}\s*$/,
      `
      // The moon has no screen depth. Reuse its sky direction for rays that miss geometry.
      if (gl_FragColor.a < 0.015) {
        vec3 reflected = normalize(mat3(m2CameraWorld) * viewReflectDir);
        // A shallow grazing lobe gives the workbench apron a visible lunar glint.
        vec3 grazingLobe = normalize(reflected - vec3(0.0, 0.19, 0.0));
        float angle = length(grazingLobe - m2Moon);
        float lunar = 1.0 - smoothstep(0.009, 0.023, angle);
        float halo = exp(-angle * 27.0);
        gl_FragColor = vec4(vec3(0.20, 0.32, 0.52) + lunar * vec3(0.95, 1.12, 1.38),
          receiver * (lunar * 0.46 + halo * 0.17));
      }
    }`,
    );
  return pass;
}

function renderNormals(renderer, scene, camera, material, target) {
  const hidden = [];
  const pet = scene.getObjectByName('space-travel-pet');
  const dissolved = pet?.userData.dissolve > 0.9 ? pet.getObjectByName('command-pet') : null;
  if (dissolved?.visible) {
    hidden.push(dissolved);
    dissolved.visible = false;
  }
  scene.traverseVisible((object) => {
    const draw = object.material;
    if (!draw) return;
    if (
      !object.isMesh ||
      object.isSky ||
      object.name === 'p5-ranking-pyramid' ||
      (!draw.depthWrite && object.name !== 'rail-tube')
    ) {
      hidden.push(object);
      object.visible = false;
    }
  });
  const previous = scene.overrideMaterial;
  const background = scene.background;
  scene.overrideMaterial = material;
  scene.background = null;
  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x7777ff, 1);
    renderer.clear();
    renderer.render(scene, camera);
  } finally {
    scene.background = background;
    scene.overrideMaterial = previous;
    for (const object of hidden) object.visible = true;
  }
}

class ScreenLightingEffect extends Effect {
  constructor(gl, scene, camera, reflections, ao) {
    const uniforms = new Map([
      ['reflections', new Uniform(null)],
      ['contactAO', new Uniform(null)],
      ['reflectionMix', new Uniform(reflections ? 1.08 : 0)],
      ['occlusionMix', new Uniform(ao ? 0.79 : 0)],
    ]);
    super('ScreenLightingEffect', composite, { attributes: EffectAttribute.CONVOLUTION, uniforms });
    this.scene = scene;
    this.camera = camera;
    this.clearColor = new Color();
    this.normalMaterial = new MeshNormalMaterial({ side: DoubleSide });
    this.buffer = new WebGLRenderTarget(1, 1, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      type: HalfFloatType,
      depthTexture: new DepthTexture(1, 1, UnsignedIntType),
    });
    this.reflections = reflections ? configureReflections(gl, scene, camera, this.buffer) : null;
    if (this.reflections) {
      this.reflections.blurRenderTarget2.texture.minFilter = LinearFilter;
      this.reflections.blurRenderTarget2.texture.magFilter = LinearFilter;
      uniforms.get('reflections').value = this.reflections.blurRenderTarget2.texture;
    }
    if (ao) {
      this.ambientOcclusion = new GTAOPass(
        scene,
        camera,
        1,
        1,
        undefined,
        { radius: 1.55, thickness: 1.7, distanceExponent: 1.15, samples: 12 },
        { radius: 4, samples: 8, depthPhi: 0.65, normalPhi: 4 },
      );
      this.ambientOcclusion.setGBuffer(this.buffer.depthTexture, this.buffer.texture);
      this.ambientOcclusion.output = GTAOPass.OUTPUT.Off;
      uniforms.get('contactAO').value = this.ambientOcclusion.gtaoMap;
    }
  }

  setSize(width, height) {
    const scale = Math.min(1, maxResolution / Math.max(1, width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    if (w === this.buffer.width && h === this.buffer.height) return;
    this.buffer.setSize(w, h);
    this.reflections?.setSize(w, h);
    this.ambientOcclusion?.setSize(w, h);
  }

  update(renderer, inputBuffer) {
    if (renderer.getContext().isContextLost()) return;
    const target = renderer.getRenderTarget();
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    renderer.getClearColor(this.clearColor);
    renderer.autoClear = false;
    try {
      renderNormals(renderer, this.scene, this.camera, this.normalMaterial, this.buffer);
      const ssr = this.reflections;
      if (ssr) {
        const { uniforms } = ssr.ssrMaterial;
        uniforms.tDiffuse.value = inputBuffer.texture;
        uniforms.cameraFar.value = this.camera.far;
        uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix);
        uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse);
        uniforms.m2CameraWorld.value.copy(this.camera.matrixWorld);
        uniforms.opacity.value = ssr.opacity;
        uniforms.maxDistance.value = ssr.maxDistance;
        uniforms.thickness.value = ssr.thickness;
        ssr.renderPass(renderer, ssr.ssrMaterial, ssr.ssrRenderTarget, 0, 0);
        ssr.renderPass(renderer, ssr.blurMaterial, ssr.blurRenderTarget, 0, 0);
        ssr.renderPass(renderer, ssr.blurMaterial2, ssr.blurRenderTarget2, 0, 0);
      }
      this.ambientOcclusion?.render(renderer);
    } finally {
      renderer.setClearColor(this.clearColor, clearAlpha);
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(target);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    // Three r170 omits these materials from the respective pass disposers.
    this.reflections?.ssrMaterial.dispose();
    this.reflections?.dispose();
    this.ambientOcclusion?.gtaoMaterial.dispose();
    this.ambientOcclusion?.blendMaterial.dispose();
    this.ambientOcclusion?.dispose();
    super.dispose();
  }
}

const seedDepth = `
uniform sampler2D opaqueDepth;
varying vec2 sampleUv;
void main() {
  gl_FragDepth = min(1.0, texture2D(opaqueDepth, sampleUv).r + 0.00022);
  gl_FragColor = vec4(0.0);
}
`;
class StageSelectiveBloom extends SelectiveBloomEffect {
  constructor(scene, camera, lighting) {
    super(scene, camera, {
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      intensity: 0.9,
      luminanceThreshold: 0.64,
      luminanceSmoothing: 0.23,
      radius: 0.63,
    });
    this.name = 'SelectiveBloomEffect';
    this.selection.layer = bloomLayer;
    this.scene = scene;
    this.lighting = lighting;
    this.emitters = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    this.seed = new ShaderMaterial({
      uniforms: { opaqueDepth: new Uniform(lighting.buffer.depthTexture) },
      vertexShader: `varying vec2 sampleUv;
        void main() { sampleUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: seedDepth,
      colorWrite: false,
      depthWrite: true,
      depthFunc: AlwaysDepth,
    });
    this.quad = new FullScreenQuad(this.seed);
    this.clearColor = new Color();
  }

  setSize(width, height) {
    BloomEffect.prototype.setSize.call(this, width, height);
  }

  update(renderer, inputBuffer, delta) {
    if (renderer.getContext().isContextLost()) return;
    const { buffer } = this.lighting;
    if (this.emitters.width !== buffer.width || this.emitters.height !== buffer.height)
      this.emitters.setSize(buffer.width, buffer.height);
    const selected = new Set();
    const lights = [];
    this.scene.traverseVisible((object) => {
      if (emissiveNames.has(object.name) || object.material?.name === 'command-eye')
        selected.add(object);
      if (object.isLight) {
        lights.push([object, object.layers.mask]);
        object.layers.enable(bloomLayer);
      }
    });
    for (const object of this.selection) if (!selected.has(object)) this.selection.delete(object);
    for (const object of selected) if (!this.selection.has(object)) this.selection.add(object);
    const target = renderer.getRenderTarget();
    const cameraMask = this.camera.layers.mask;
    const background = this.scene.background;
    const autoClear = renderer.autoClear;
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    try {
      this.scene.background = null;
      this.camera.layers.set(bloomLayer);
      renderer.autoClear = false;
      renderer.setRenderTarget(this.emitters);
      renderer.setClearColor(0, 0);
      renderer.clear();
      this.quad.render(renderer);
      renderer.render(this.scene, this.camera);
      BloomEffect.prototype.update.call(this, renderer, this.emitters, delta);
    } finally {
      for (const [light, mask] of lights) light.layers.mask = mask;
      this.camera.layers.mask = cameraMask;
      this.scene.background = background;
      renderer.setClearColor(this.clearColor, alpha);
      renderer.autoClear = autoClear;
      renderer.setRenderTarget(target);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.selection.clear();
    this.quad.dispose();
    super.dispose();
  }
}

const motionFragment = `
uniform float speed;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
  if (speed > 0.001) {
    vec2 direction = (uv - vec2(0.5)) * speed * 0.045;
    vec3 streak = inputColor.rgb * 0.34;
    streak += texture2D(inputBuffer, clamp(uv - direction * 0.38, 0.0, 1.0)).rgb * 0.29;
    streak += texture2D(inputBuffer, clamp(uv - direction * 0.74, 0.0, 1.0)).rgb * 0.23;
    streak += texture2D(inputBuffer, clamp(uv - direction, 0.0, 1.0)).rgb * 0.14;
    outputColor.rgb = streak;
  }
}
`;
class TravelMotionBlur extends Effect {
  constructor(camera) {
    super('TravelMotionBlur', motionFragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([['speed', new Uniform(0)]]),
    });
    this.camera = camera;
  }

  update() {
    const { travelStage, travelStageProgress } = this.camera.userData;
    this.uniforms.get('speed').value =
      travelStage === 'launch' ? Math.sin(Math.PI * travelStageProgress) : 0;
  }
}

export default function AdvancedStageEffects({ reflection, ao, motion }) {
  const { gl, scene, camera } = useThree();
  const effects = useMemo(() => {
    const lighting = new ScreenLightingEffect(gl, scene, camera, reflection, ao);
    return [lighting, new StageSelectiveBloom(scene, camera, lighting)];
  }, [gl, scene, camera, reflection, ao]);
  const blur = useMemo(() => (motion ? new TravelMotionBlur(camera) : null), [camera, motion]);
  const mounted = useRef(new Set());
  useEffect(() => {
    const set = mounted.current;
    set.add(effects);
    return () => {
      set.delete(effects);
      queueMicrotask(() => {
        if (!set.has(effects)) {
          for (const effect of [...effects].reverse()) effect.dispose();
        }
      });
    };
  }, [effects]);
  return (
    <>
      <primitive object={effects[0]} />
      <primitive object={effects[1]} />
      {blur && <primitive object={blur} />}
    </>
  );
}
