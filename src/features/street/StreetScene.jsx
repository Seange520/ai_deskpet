import EnvLayer from '../env/EnvLayer';
import HefiNpc from '../trust/HefiNpc';
import KickbackScene from './KickbackScene';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, Vector3, AdditiveBlending } from 'three';
import ToonMaterial from '../npr/ToonMaterial';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import { STREET, PROBES, sampleCircuit } from './circuit.mjs';
import { useStreet } from './streetStore';

function Block({ p, size, color = '#344858', metal = false, ...props }) {
  return (
    <RoundedBox
      position={p}
      args={size}
      radius={Math.min(...size) * 0.12}
      smoothness={2}
      castShadow
      receiveShadow
      {...props}
    >
      {metal ? (
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.55} />
      ) : (
        <ToonMaterial color={color} />
      )}
    </RoundedBox>
  );
}
function Sign({ text, p, size = [2, 0.5], ink = '#7fffe8', face = 1, bg = '#142f36' }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 256);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    ctx.strokeRect(13, 13, 742, 230);
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < 256; y += 6) ctx.fillRect(0, y, 768, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink;
    ctx.font = 'bold 78px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 123, 706);
    return new CanvasTexture(c);
  }, [text, ink, bg]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={p} rotation={[0, face === 1 ? 0 : Math.PI, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
function Wire({ a, b, color = '#3f5359', radius = 0.02, xray = false }) {
  const { position, length } = useMemo(() => {
    const start = new Vector3(...a),
      end = new Vector3(...b),
      direction = end.clone().sub(start);
    return { position: start.add(end).multiplyScalar(0.5).toArray(), length: direction.length() };
  }, [a, b]);
  // Cylinder orientation is set using a quaternion, avoiding per-frame allocations.
  const ref = useRef();
  useEffect(() => {
    ref.current.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(...b).sub(new Vector3(...a)).normalize(),
    );
  }, [a, b]);
  return (
    <mesh ref={ref} position={position} renderOrder={xray ? 20 : 0}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      {xray ? (
        <meshBasicMaterial
          color={color}
          depthTest={false}
          depthWrite={false}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      ) : (
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.4} />
      )}
    </mesh>
  );
}
function Shop({ x, side, index }) {
  const z = side * 2.1,
    front = side * 1.57,
    face = side < 0 ? 1 : -1;
  const colors = ['#324e5a', '#5b4850', '#3e5456'];
  return (
    <group>
      <Block
        p={[x, 2.2 + index * 0.25, z]}
        size={[2.35, 4.4 + index * 0.5, 1]}
        color={colors[(index + (side > 0 ? 1 : 0)) % 3]}
      />
      <Block p={[x, 3.1, front]} size={[2.42, 0.14, 0.22]} color="#182a36" metal />
      <Block p={[x, 1.03, front]} size={[1.95, 1.95, 0.08]} color="#1c2c39" />
      {Array.from({ length: 13 }, (_, i) => (
        <Block
          key={i}
          p={[x, 0.2 + i * 0.13, front - side * 0.05]}
          size={[1.92, 0.035, 0.04]}
          color={i % 4 ? '#52636a' : '#758381'}
          metal
        />
      ))}
      {[0, 1].map((n) => (
        <group key={n}>
          <Block
            p={[x - 0.58 + n * 1.12, 3.8, front - side * 0.025]}
            size={[0.85, 1.05, 0.08]}
            color="#13232f"
          />
          <Block
            p={[x - 0.58 + n * 1.12, 3.8, front - side * 0.08]}
            size={[0.69, 0.88, 0.02]}
            color={index % 2 ? '#9a7971' : '#426d73'}
          />
          <Block
            p={[x - 0.58 + n * 1.12, 3.8, front - side * 0.11]}
            size={[0.035, 0.9, 0.03]}
            color="#233640"
            metal
          />
        </group>
      ))}
      <Sign
        text={
          (side < 0
            ? ['旧件回收', '零号电务', '第七维修铺']
            : ['热汤 · 夜食', '磁带修复', '熔炉外街'])[index]
        }
        p={[x, 2.65, front - side * 0.09]}
        face={face}
        size={[2.04, 0.55]}
        ink={side < 0 ? '#72efda' : '#ffbe7a'}
      />
      <Block p={[x + 0.83, 4.7, front]} size={[0.5, 0.62, 0.32]} color="#a7ada1" metal />
      {[0, 1, 2, 3].map((i) => (
        <Block
          key={'vent' + i}
          p={[x + 0.83, 4.51 + i * 0.12, front - side * 0.18]}
          size={[0.4, 0.035, 0.02]}
          color="#293f48"
        />
      ))}
      <Wire a={[x - 1.05, 0.1, front]} b={[x - 1.05, 4.6, front]} radius={0.045} color="#b08e6b" />
      <Block p={[x, 4.55 + index * 0.5, z]} size={[2.46, 0.18, 1.2]} color="#192d39" />
    </group>
  );
}
const fireVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fireFragment = `varying vec2 vUv; uniform float time; void main(){
 vec2 p=vUv; float sway=sin(p.y*11.-time*9.)*.07*p.y;
 float width=(1.-p.y)*.44; float flame=1.-smoothstep(width*.3,width,abs(p.x-.5+sway));
 float alpha=flame*smoothstep(0.,.12,p.y)*(1.-smoothstep(.62,1.,p.y));
 vec3 c=mix(vec3(1.,.12,.008),vec3(1.,.83,.21),flame*(1.-p.y));
 gl_FragColor=vec4(c*2.,alpha*.85);}`;
const smokeFragment = `varying vec2 vUv; uniform float alpha; void main(){float r=length(vUv-.5)*2.;float a=(1.-smoothstep(.1,1.,r))*alpha;gl_FragColor=vec4(vec3(.86,.91,.95),a);}`;
function FaultFX({ paused, reduced }) {
  const group = useRef(),
    wire = useRef(),
    flames = useRef(),
    smoke = useRef(),
    sparks = useRef();
  const smokeUniforms = useMemo(
    () => Array.from({ length: 14 }, () => ({ alpha: { value: 0 } })),
    [],
  );
  const flameUniforms = useMemo(
    () => Array.from({ length: 5 }, () => ({ time: { value: 0 } })),
    [],
  );
  const positions = useMemo(() => new Float32Array(90), []);
  const { camera } = useThree();
  useFrame(() => {
    if (paused || !group.current) return;
    const s = useStreet.getState(),
      time = s.faultTime ?? s.clock;
    group.current.visible = s.heat > 0;
    wire.current.material.emissiveIntensity = Math.min(3, s.heat / 24);
    wire.current.material.color.set(s.heat > 0 ? '#ff371a' : '#2e5d69');
    smoke.current.visible = ['smoke', 'sparks', 'fire', 'tripped'].includes(s.stage) && s.heat > 5;
    smoke.current.children.forEach((o, i) => {
      const p = (time * (reduced ? 0.22 : 0.48) + i / 14) % 1;
      o.position.set(Math.sin(i * 7.1 + p * 3) * 0.18, p * 1.8, Math.cos(i * 3.4) * 0.1);
      o.scale.setScalar(0.25 + p * 0.65);
      o.quaternion.copy(camera.quaternion);
      smokeUniforms[i].alpha.value = Math.sin(p * Math.PI) * 0.45;
    });
    flames.current.visible = s.stage === 'fire' || (s.stage === 'tripped' && s.heat > 60);
    flames.current.children.forEach((o, i) => {
      o.quaternion.copy(camera.quaternion);
      flameUniforms[i].time.value = reduced ? 1 : time + i;
    });
    sparks.current.visible = s.stage === 'sparks' || s.stage === 'fire';
    for (let i = 0; i < 30; i++) {
      const t = (time * 1.7 + i * 0.137) % 1,
        angle = i * 2.399;
      positions[i * 3] = Math.cos(angle) * t * 0.8;
      positions[i * 3 + 1] = t * 2.2 - 2 * t * t;
      positions[i * 3 + 2] = Math.sin(angle) * t * 0.55;
    }
    sparks.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <>
      <mesh ref={wire} position={[8.15, 1.13, -1.4]}>
        <boxGeometry args={[0.6, 0.035, 0.045]} />
        <meshStandardMaterial color="#2e5d69" emissive="#ff2610" emissiveIntensity={0} />
      </mesh>
      <group ref={group} position={[8.15, 1.14, -1.36]} visible={false} name="p10-fault-chain">
        <group ref={smoke}>
          {smokeUniforms.map((uniforms, i) => (
            <mesh key={i}>
              <planeGeometry args={[1, 1]} />
              <shaderMaterial
                vertexShader={fireVertex}
                fragmentShader={smokeFragment}
                uniforms={uniforms}
                transparent
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
        <group ref={flames}>
          {flameUniforms.map((uniforms, i) => (
            <mesh key={i} position={[(i - 2) * 0.08, 0.25 + i * 0.04, 0]}>
              <planeGeometry args={[0.48, 0.8 + (i % 2) * 0.24]} />
              <shaderMaterial
                vertexShader={fireVertex}
                fragmentShader={fireFragment}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
        <points ref={sparks} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color="#ffce75"
            size={0.045}
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>
    </>
  );
}
function CircuitView() {
  const scanner = useStreet((s) => s.scanner),
    repaired = useStreet((s) => s.returnFixed);
  if (!scanner) return null;
  return (
    <group name="p10-eagle-eye" renderOrder={20}>
      {[
        [
          [6.1, 0.15, -1.85],
          [8.15, 0.15, -1.85],
        ],
        [
          [8.15, 0.15, -1.85],
          [8.15, 1.12, -1.85],
        ],
        [
          [8.15, 1.12, -1.85],
          [9.7, 1.12, -1.85],
        ],
        [
          [9.7, 1.12, -1.85],
          [9.7, 2.45, -1.05],
        ],
        [
          [8.15, 0.15, -1.85],
          [10.9, 0.15, 1.85],
        ],
        [
          [10.9, 0.15, 1.85],
          [10.9, 0.85, 1.48],
        ],
      ].map(([a, b], i) => (
        <Wire key={i} a={a} b={b} radius={0.024} color={i < 4 ? '#48ffe2' : '#ffb964'} xray />
      ))}
      {PROBES.map((p) => (
        <mesh key={p.id} position={p.position} renderOrder={25}>
          <sphereGeometry args={[0.095, 16, 12]} />
          <meshBasicMaterial
            color={p.id === 'return' && !repaired ? '#ff684d' : '#78fff0'}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function StreetRuntime({ paused }) {
  const { camera } = useThree();
  const elapsed = useRef(0),
    projected = useMemo(() => new Vector3(), []);
  useEffect(() => () => useStreet.getState().closeScanner(), []);
  useFrame((_, dt) => {
    const nav = useWorldMap.getState(),
      blocked = paused || nav.open || nav.active || useExploration.getState().blocked;
    if (!blocked) {
      elapsed.current += Math.min(dt, 0.25);
      if (elapsed.current >= 0.1) {
        useStreet.getState().tick(elapsed.current);
        elapsed.current = 0;
      }
    }
    const s = useStreet.getState();
    for (const probe of PROBES) {
      const el = document.querySelector(`[data-street-probe="${probe.id}"]`);
      if (!el) continue;
      projected.set(...probe.position).project(camera);
      const visible =
        s.scanner &&
        !blocked &&
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.88 &&
        Math.abs(projected.y) < 0.83;
      el.hidden = !visible;
      if (visible) {
        el.style.left = `${(projected.x + 1) * 50}%`;
        el.style.top = `${(1 - projected.y) * 50}%`;
      }
    }
  });
  return null;
}
function BreathingLamp({ paused }) {
  const glow = useRef(),
    light = useRef();
  useFrame(() => {
    if (paused || !glow.current) return;
    const s = useStreet.getState(),
      c = sampleCircuit(s);
    const flicker =
      c.starting && !s.completed && !s.softStart ? (Math.sin(s.clock * 49) > 0.25 ? 0.12 : 0.5) : 1;
    const brightness = c.live ? Math.max(0.02, c.voltage / 24) * flicker : 0;
    glow.current.material.emissiveIntensity = brightness * 1.7;
    light.current.intensity = brightness * 3;
  });
  return (
    <group position={[9.7, 0, -1.02]} name="p10-breathing-lamp">
      <Block p={[0, 0.08, 0]} size={[0.32, 0.16, 0.3]} color="#304857" metal />
      <Wire a={[0, 0.14, 0]} b={[0, 2.9, 0]} radius={0.047} color="#60858b" />
      <Wire a={[0, 2.9, 0]} b={[0, 2.9, 0.58]} radius={0.04} />
      <Block p={[0, 2.88, 0.51]} size={[0.53, 0.13, 0.43]} color="#253c46" metal />
      <mesh ref={glow} position={[0, 2.8, 0.51]}>
        <boxGeometry args={[0.42, 0.035, 0.33]} />
        <meshStandardMaterial color="#fff4ca" emissive="#ffd49b" emissiveIntensity={1.7} />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 2.6, 0.55]}
        color="#ffc986"
        distance={5}
        decay={2}
        intensity={3}
      />
    </group>
  );
}
export default function StreetScene({ paused = false }) {
  const reduced = useReducedMotionPreference();
  return (
    <group
      name="p10-forge-street"
      userData={{ visualOnly: true, terrain: 'original-p9-hardware-bridge' }}
    >
      <StreetRuntime paused={paused} />
      <KickbackScene paused={paused} />
      <HefiNpc />
      <EnvLayer paused={paused} />
      {/* Existing bridge is the only walkable surface. Both ends stay open. */}
      {[-1, 1].map((side) =>
        [6.5, 9, 11.5].map((x, i) => <Shop key={`${side}:${i}`} x={x} side={side} index={i} />),
      )}
      {[5.1, 12.7].map((x) => (
        <group key={x}>
          {[-1, 1].map((side) => (
            <Wire key={side} a={[x, 0, side * 1.4]} b={[x, 3.65, side * 1.4]} radius={0.04} />
          ))}
          <Wire a={[x, 3.65, -1.4]} b={[x, 3.65, 1.4]} radius={0.035} color="#b99b72" />
        </group>
      ))}
      <Sign text="熔 炉 外 街" p={[5.12, 3.35, 0]} size={[2.4, 0.46]} />
      <group position={[11.15, 0, 1.13]}>
        <Block p={[0, 0.6, 0]} size={[1.5, 1.15, 0.55]} color="#4e6968" />
        <Block p={[0, 1.2, 0]} size={[1.65, 0.08, 0.72]} color="#bcc3ae" metal />
        <Block
          p={[0, 2.05, 0.1]}
          size={[1.8, 0.13, 0.86]}
          color="#c7835e"
          rotation={[-0.12, 0, 0]}
        />
        {[0, 1, 2, 3].map((i) => (
          <Block
            key={i}
            p={[-0.65 + i * 0.43, 2.13, 0.1]}
            size={[0.14, 0.025, 0.85]}
            color="#334f54"
            rotation={[-0.12, 0, 0]}
          />
        ))}
        <Sign text="一 碗 热 汤" p={[0, 0.8, -0.29]} face={-1} ink="#ffe1a2" size={[1.25, 0.35]} />
        {[-0.5, 0.35].map((x) => (
          <mesh key={x} position={[x, 1.28, 0]}>
            <cylinderGeometry args={[0.16, 0.1, 0.09, 16]} />
            <ToonMaterial color="#e2cbb0" />
          </mesh>
        ))}
      </group>
      <group position={[11.9, 0.02, 0.88]} name="p10-night-vendor">
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.18, 18, 14]} />
          <ToonMaterial finish="ceramic" color="#e4bc92" />
        </mesh>
        <Block p={[0, 0.82, 0]} size={[0.4, 0.6, 0.26]} color="#cd8c63" />
        <Block p={[0, 0.78, -0.145]} size={[0.3, 0.4, 0.03]} color="#365a60" />
        {[-0.12, 0.12].map((x) => (
          <Block key={x} p={[x, 0.3, 0]} size={[0.13, 0.5, 0.16]} color="#263e50" />
        ))}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.22, 0.21, 0.08, 18]} />
          <ToonMaterial color="#f1d5aa" />
        </mesh>
      </group>
      <Block p={[8.15, 0.95, -1.49]} size={[0.9, 0.75, 0.21]} color="#657a78" metal />
      <Sign text="G0 / 24V" p={[8.15, 1.17, -1.365]} size={[0.64, 0.18]} ink="#ffe0a2" />
      <Block p={[10.9, 0.45, 1.49]} size={[0.95, 0.8, 0.5]} color="#6c7f81" metal />
      <mesh position={[10.9, 0.5, 1.19]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.025, 8, 24]} />
        <meshStandardMaterial color="#172e38" metalness={0.7} roughness={0.4} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Wire
          key={i}
          a={[6 + i * 0.15, 3.8, -1.6]}
          b={[12.3 + i * 0.15, 3.25, 1.6]}
          radius={0.009}
        />
      ))}
      <BreathingLamp paused={paused} />
      <CircuitView />
      <FaultFX paused={paused} reduced={reduced} />
    </group>
  );
}
