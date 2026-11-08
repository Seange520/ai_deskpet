import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Vector3, AdditiveBlending } from 'three';
import ToonMaterial from '../npr/ToonMaterial';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
import { useWorldMap } from '../world/navigationStore';
import { useExploration } from '../world/explorationState';
import { KICKBACK_PROBES } from './kickback.mjs';
import { useKickback, nearKickback } from './kickbackStore';
function PanelBox({ p, size, color = '#294b5c', ...props }) {
  return (
    <RoundedBox position={p} args={size} radius={0.035} smoothness={2} {...props}>
      <ToonMaterial color={color} />
    </RoundedBox>
  );
}
function Runtime({ paused }) {
  const { camera } = useThree(),
    elapsed = useRef(0),
    point = useMemo(() => new Vector3(), []);
  useEffect(() => () => useKickback.getState().suspendView(), []);
  useFrame((_, dt) => {
    const nav = useWorldMap.getState(),
      inRange = nearKickback();
    const blocked = paused || nav.open || nav.active || useExploration.getState().blocked;
    if (!inRange && (useKickback.getState().open || useKickback.getState().courseOpen))
      useKickback.getState().suspendView();
    if (!blocked) {
      if (inRange) useKickback.getState().encounter();
      elapsed.current += Math.min(dt, 0.25);
      if (elapsed.current >= 0.1) {
        useKickback.getState().tick(elapsed.current);
        elapsed.current = 0;
      }
    } else elapsed.current = 0;
    const s = useKickback.getState();
    for (const probe of KICKBACK_PROBES) {
      const el = document.querySelector(`[data-kickback-probe="${probe.id}"]`);
      if (!el) continue;
      point.set(...probe.position).project(camera);
      const visible =
        s.open &&
        s.scanner &&
        inRange &&
        !blocked &&
        point.z > -1 &&
        point.z < 1 &&
        Math.abs(point.x) < 0.9 &&
        Math.abs(point.y) < 0.83;
      el.hidden = !visible;
      if (visible) {
        el.style.left = `${Math.round(((point.x + 1) * window.innerWidth) / 2)}px`;
        el.style.top = `${Math.round(((1 - point.y) * window.innerHeight) / 2)}px`;
      }
    }
  });
  return null;
}
export default function KickbackScene({ paused }) {
  const screen = useRef(),
    lamp = useRef(),
    streetLamp = useRef(),
    contact = useRef(),
    arc = useRef(),
    charge = useRef();
  const scanner = useKickback((s) => s.scanner),
    repair = useKickback((s) => s.repair);
  const reduced = useReducedMotionPreference();
  useFrame(() => {
    const s = useKickback.getState();
    if (!screen.current || paused) return;
    const blackout = s.lastEvent?.failed && s.pulse > 0;
    screen.current.material.emissiveIntensity = !s.powered || blackout ? 0.02 : 0.65;
    screen.current.material.color.set(!s.powered || blackout ? '#0c202c' : '#6ed2ca');
    lamp.current.material.color.set(!s.powered || blackout ? '#183438' : '#a7e7e1');
    lamp.current.material.emissiveIntensity = !s.powered || blackout ? 0 : 1.1;
    streetLamp.current.material.emissiveIntensity = !s.powered || blackout ? 0 : 1.8;
    streetLamp.current.material.color.set(!s.powered || blackout ? '#1b353b' : '#e9e1bd');
    contact.current.rotation.z = s.closed ? 0 : 0.45;
    arc.current.visible = !!s.lastEvent?.failed && s.pulse > 0.1 && !reduced;
    if (arc.current.visible) arc.current.material.opacity = Math.min(1, s.pulse * 2);
    charge.current.scale.y = Math.max(0.02, Math.min(1, s.stressEnergy / 0.12));
  });
  return (
    <group name="p10-kickback-branch" userData={{ visualOnly: true, noNewCollider: true }}>
      <Runtime paused={paused} />
      <PanelBox p={[12.1, 1.34, -1.49]} size={[1.65, 1.76, 0.2]} color="#466773" />
      <PanelBox p={[12.1, 1.34, -1.35]} size={[1.47, 1.57, 0.065]} color="#122f43" />
      <PanelBox p={[11.78, 1.93, -1.29]} size={[0.55, 0.32, 0.05]} color="#477c83" />
      <mesh ref={screen} name="kickback-controller-screen" position={[11.78, 1.93, -1.255]}>
        <planeGeometry args={[0.47, 0.24]} />
        <meshStandardMaterial color="#6ed2ca" emissive="#6ed2ca" emissiveIntensity={0.65} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <PanelBox
          key={i}
          p={[11.72 + i * 0.14, 1.37, -1.27]}
          size={[0.07, 0.24, 0.04]}
          color="#c9b986"
        />
      ))}
      <group ref={contact} name="kickback-relay-contact" position={[11.72, 1.15, -1.24]}>
        <PanelBox p={[0.16, 0, 0]} size={[0.36, 0.04, 0.04]} color="#c8b28c" />
      </group>
      <PanelBox
        p={[12.45, 1.55, -1.26]}
        size={[0.4, 0.22, 0.06]}
        color={repair === 'none' ? '#353d48' : '#8eb599'}
      />
      {repair !== 'none' && (
        <PanelBox
          p={[12.45, 1.55, -1.2]}
          size={repair === 'diode' ? [0.2, 0.07, 0.035] : [0.24, 0.14, 0.035]}
          color="#d2ceaa"
        />
      )}
      <PanelBox p={[12.63, 0.58, -1.46]} size={[0.8, 0.7, 0.31]} color="#60828c" />
      <mesh position={[12.63, 0.57, -1.275]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.21, 0.025, 8, 24]} />
        <ToonMaterial color="#183447" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <PanelBox
          key={i}
          p={[12.63, 0.4 + i * 0.08, -1.25]}
          size={[0.36, 0.014, 0.018]}
          color="#314d5c"
        />
      ))}
      <mesh ref={lamp} position={[12.1, 2.42, -1.3]}>
        <sphereGeometry args={[0.075, 14, 10]} />
        <meshStandardMaterial color="#a7e7e1" emissive="#90e8d2" emissiveIntensity={1} />
      </mesh>
      <PanelBox p={[13.18, 1.55, -1.4]} size={[0.065, 3.1, 0.065]} color="#719098" />
      <PanelBox p={[13.18, 3.04, -1.06]} size={[0.075, 0.07, 0.7]} color="#719098" />
      <PanelBox p={[13.18, 3.01, -0.75]} size={[0.5, 0.12, 0.35]} color="#263f4c" />
      <mesh ref={streetLamp} name="kickback-street-lamp" position={[13.18, 2.94, -0.75]}>
        <boxGeometry args={[0.43, 0.025, 0.28]} />
        <meshStandardMaterial color="#e9e1bd" emissive="#e9e1bd" emissiveIntensity={1.8} />
      </mesh>
      <PanelBox p={[12.1, 2.22, -1.35]} size={[1.55, 0.12, 0.09]} color="#82adbc" />
      <mesh ref={charge} position={[12.77, 1.18, -1.255]}>
        <boxGeometry args={[0.035, 0.6, 0.025]} />
        <meshBasicMaterial color="#ffb478" />
      </mesh>
      <mesh ref={arc} visible={false} position={[11.82, 1.22, -1.2]} rotation={[0, 0, -0.25]}>
        <planeGeometry args={[0.18, 0.045]} />
        <meshBasicMaterial
          color="#a4f6ff"
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {scanner && (
        <group name="p10-kickback-eagle-eye">
          {[
            [12.1, 1.84, 1.4, 0.018],
            [12.1, 0.96, 1.4, 0.018],
          ].map(([x, y, w, h], i) => (
            <mesh key={i} position={[x, y, -1.59]} renderOrder={24}>
              <boxGeometry args={[w, h, 0.018]} />
              <meshBasicMaterial
                color={i ? '#80bcff' : '#ffce89'}
                depthTest={false}
                depthWrite={false}
                transparent
                opacity={0.85}
              />
            </mesh>
          ))}
          {KICKBACK_PROBES.map((p) => (
            <mesh key={p.id} position={p.position} renderOrder={25}>
              <sphereGeometry args={[0.045, 12, 8]} />
              <meshBasicMaterial color="#a0fff3" depthTest={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
