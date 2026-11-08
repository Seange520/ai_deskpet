import { useRef } from 'react';
import { Vector3, Quaternion } from 'three';
import { useFrame } from '@react-three/fiber';
import { CASE_SEVEN_LAMPS, ENV_CLUES, lampBrightness } from './env.mjs';
import { useEnv } from './envStore';
import { useStreet } from '../street/streetStore';
import { useWorldMap } from '../world/navigationStore';
const independentStart = new Vector3(13.08, 0.16, 1.28),
  independentEnd = new Vector3(8.15, 0.16, -1.49);
const independentDirection = independentEnd.clone().sub(independentStart);
const independentMid = independentStart.clone().add(independentEnd).multiplyScalar(0.5);
const independentRotation = new Quaternion().setFromUnitVectors(
  new Vector3(0, 1, 0),
  independentDirection.clone().normalize(),
);
export default function EnvLayer({ paused }) {
  const clueWires = useRef([]);
  const fixedLine = useRef(),
    groundMemory = useRef();
  const lamps = useRef([]),
    wires = useRef([]),
    noise = useRef(),
    clock = useRef(0);
  useFrame((_, dt) => {
    if (!paused) clock.current += Math.min(dt, 0.25);
    const s = useEnv.getState(),
      eye = useStreet.getState().scanner || s.eye,
      pos = useWorldMap.getState().position;
    lamps.current.forEach((m, i) => {
      if (m)
        m.emissiveIntensity = s.powered
          ? lampBrightness('L' + (i + 2), clock.current, s.save.case.fixApplied) * 1.6
          : 0;
    });
    wires.current.forEach((m, i) => {
      if (m) m.visible = eye && s.save.eagleEye.rememberedLines.includes('lamp_L' + (i + 2));
    });
    clueWires.current.forEach((m, i) => {
      if (m) m.visible = eye && s.save.eagleEye.rememberedLines.includes(ENV_CLUES[i].id);
    });
    if (fixedLine.current) fixedLine.current.visible = s.save.case.fixApplied;
    if (groundMemory.current)
      groundMemory.current.visible = eye && s.save.eagleEye.rememberedLines.includes('g0_return');
    if (noise.current) noise.current.visible = eye && Math.hypot(pos[0] - 13.08, pos[2] - 1.28) < 3;
  });
  return (
    <group name="p10-env-lamps" userData={{ visualOnly: true }}>
      {[
        [9.7, 1.6, 1.45],
        [10.9, 0.6, 1.19],
        [13.9, 0.12, 1.3],
        [7.6, 3.4, 1.35],
        [8.6, 0.15, 1.35],
      ].map((p, i) => (
        <mesh
          key={'memory' + i}
          ref={(m) => (clueWires.current[i] = m)}
          position={p}
          visible={false}
          renderOrder={20}
        >
          <boxGeometry args={[0.25, 0.012, 0.012]} />
          <meshBasicMaterial color="#91dac7" depthTest={false} />
        </mesh>
      ))}
      <mesh position={[9.5, 0.12, 1.28]} name="p10-env-shared-ground">
        <boxGeometry args={[7.05, 0.025, 0.025]} />
        <meshStandardMaterial color="#677952" />
      </mesh>
      <mesh
        ref={fixedLine}
        position={independentMid}
        quaternion={independentRotation}
        visible={false}
        name="p10-env-independent-ground"
      >
        <cylinderGeometry args={[0.014, 0.014, independentDirection.length(), 6]} />
        <meshStandardMaterial color="#668a61" />
      </mesh>
      <mesh
        ref={groundMemory}
        position={independentMid}
        quaternion={independentRotation}
        visible={false}
        renderOrder={20}
      >
        <cylinderGeometry args={[0.008, 0.008, independentDirection.length(), 6]} />
        <meshBasicMaterial color="#91dac7" depthTest={false} />
      </mesh>
      <group name="p10-env-flower-half" position={[8.6, 0.08, 1.35]}>
        <mesh>
          <boxGeometry args={[0.75, 0.12, 0.24]} />
          <meshStandardMaterial color="#65513c" />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <group key={i} position={[-0.3 + i * 0.12, 0.15, 0]}>
            <mesh>
              <cylinderGeometry args={[0.008, 0.008, 0.22, 4]} />
              <meshStandardMaterial color={i < 3 ? '#638159' : '#74654a'} />
            </mesh>
            {i < 3 && (
              <mesh position={[0, 0.12, 0]}>
                <sphereGeometry args={[0.045, 5, 5]} />
                <meshStandardMaterial color="#c9a77b" />
              </mesh>
            )}
          </group>
        ))}
      </group>
      <group name="p10-env-cat-alley" position={[13.9, 0.13, 1.3]}>
        <mesh>
          <boxGeometry args={[0.3, 0.22, 0.15]} />
          <meshStandardMaterial color="#6d7779" />
        </mesh>
        <mesh position={[-0.13, 0.12, 0]}>
          <sphereGeometry args={[0.11, 6, 5]} />
          <meshStandardMaterial color="#6d7779" />
        </mesh>
        {[-0.065, 0.065].map((z) => (
          <mesh key={z} position={[-0.15, 0.23, z]}>
            <coneGeometry args={[0.045, 0.11, 3]} />
            <meshStandardMaterial color="#6d7779" />
          </mesh>
        ))}
      </group>
      <group name="p10-env-clock" position={[7.6, 3.4, 1.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.08, 12]} />
          <meshStandardMaterial color="#b9b6a3" />
        </mesh>
        <mesh position={[0, 0.08, -0.05]}>
          <boxGeometry args={[0.018, 0.17, 0.02]} />
          <meshStandardMaterial color="#2d4248" />
        </mesh>
        <mesh position={[0.06, 0, -0.05]}>
          <boxGeometry args={[0.13, 0.018, 0.02]} />
          <meshStandardMaterial color="#2d4248" />
        </mesh>
      </group>

      {CASE_SEVEN_LAMPS.lamps.map((l, i) => (
        <group key={l.id} position={l.position} name={'p10-env-' + l.id}>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.035, 0.05, 2.7, 8]} />
            <meshStandardMaterial color="#485b62" />
          </mesh>
          <mesh position={[0, 2.55, -0.12]}>
            <boxGeometry args={[0.36, 0.12, 0.3]} />
            <meshStandardMaterial
              ref={(m) => (lamps.current[i] = m)}
              color="#d8c7a2"
              emissive="#ffdba0"
            />
          </mesh>
          <mesh position={[0.065, 0.8, 0]}>
            <boxGeometry args={[0.035, i === 6 ? 1.4 : 1.6, 0.04]} />
            <meshStandardMaterial color={i === 6 ? '#8b4e32' : '#69745c'} roughness={0.95} />
          </mesh>
          <mesh position={[0.08, 0.28, 0.03]}>
            <boxGeometry args={[0.1, 0.12, 0.06]} />
            <meshStandardMaterial color={i === 6 ? '#87412b' : '#65736a'} />
          </mesh>
          <mesh
            ref={(m) => (wires.current[i] = m)}
            position={[0.065, 0.8, 0]}
            visible={false}
            renderOrder={20}
          >
            <boxGeometry args={[0.018, 1.5, 0.018]} />
            <meshBasicMaterial color="#91dac7" depthTest={false} />
          </mesh>
        </group>
      ))}
      <group
        ref={noise}
        name="p10-env-contact-noise"
        visible={false}
        position={[13.08, 0.35, 1.28]}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[Math.sin(i * 7) * 0.15, i * 0.04, Math.cos(i * 4) * 0.1]}>
            <sphereGeometry args={[0.007, 4, 4]} />
            <meshBasicMaterial color="#b6c9c0" transparent opacity={0.22} />
          </mesh>
        ))}
      </group>
      <group name="p10-env-inspector" position={[7.5, 0, 1.28]}>
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial color="#bd9f7b" />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.32, 0.6, 0.24]} />
          <meshStandardMaterial color="#59786e" />
        </mesh>
      </group>
    </group>
  );
}
