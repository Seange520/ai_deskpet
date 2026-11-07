import { useRef, useMemo, useEffect } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import ToonMaterial from '../npr/ToonMaterial';
import { RoundedBox } from '@react-three/drei';
import PetAffection from './PetAffection';
import PetContactShadow from './PetContactShadow';
import { usePetAnimation } from './usePetAnimation';

export default function PetModel(props) {
  const { body, head, eyes, eyeMeshes } = usePetAnimation(props);
  const ground = useRef(null);
  const screen = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#142840';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#203d56';
    ctx.lineWidth = 1;
    for (let y = 8; y < 128; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#428481';
    ctx.fillRect(14, 112, 24, 3);
    ctx.fillRect(42, 112, 8, 3);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.name = 'npr-screen-face';
    return texture;
  }, []);
  useEffect(() => () => screen.dispose(), [screen]);
  return (
    <group>
      <group ref={ground} rotation={[0, -0.16, 0]}>
        {!props.evolving && (
          <PetContactShadow
            body={body}
            ground={ground}
            travelRoot={props.travelRoot}
            paused={props.paused}
            reduced={props.reducedMotion}
          />
        )}
        <group ref={body} name="command-pet" userData={{ form: props.form || 'Spark' }}>
          <group
            ref={head}
            name="command-head"
            onClick={(event) => {
              if (!props.onPetHead || event.button !== 0 || event.delta > 5) return;
              event.stopPropagation();
              props.onPetHead();
            }}
          >
            {(props.petting > 0 || props.dizzy > 0) &&
              !props.environment?.idleSleeping &&
              !props.paused &&
              !props.interaction.dark &&
              !props.interaction.sleeping && (
                <PetAffection
                  burst={props.dizzy || props.petting}
                  dizzy={props.dizzy > 0}
                  reducedMotion={props.reducedMotion}
                />
              )}
            <RoundedBox
              position={[0, 0.65, 0]}
              args={props.form === 'Kernel' ? [1.85, 1.3, 1.15] : [1.85, 1.3, 1.05]}
              radius={props.form === 'Kernel' ? 0.23 : 0.1}
              smoothness={3}
            >
              <ToonMaterial finish="ceramic" name="pet-shell" color="#fff3d1" />
            </RoundedBox>
            <mesh position={[0, 0.65, props.form === 'Kernel' ? 0.6 : 0.54]}>
              <boxGeometry args={[1.48, 0.92, 0.07]} />
              <ToonMaterial name="pet-screen" map={screen} color="#ffffff" />
            </mesh>
            {[-0.36, 0.36].map((x) => (
              <mesh
                key={x}
                ref={(mesh) => {
                  eyeMeshes.current[x < 0 ? 0 : 1] = mesh;
                }}
                position={[x, 0.75, props.form === 'Kernel' ? 0.67 : 0.61]}
                scale={[0.75, 1.6, 0.55]}
              >
                <sphereGeometry args={[0.13, 24, 16]} />
                <ToonMaterial
                  ref={(material) => {
                    eyes.current[x < 0 ? 0 : 1] = material;
                  }}
                  name="command-eye"
                  color="#baffdd"
                  emissive="#6ee7b7"
                  emissiveIntensity={0.15}
                  toneMapped={!props.cinematic}
                />
              </mesh>
            ))}
            <mesh
              position={[0, 0.4, props.form === 'Kernel' ? 0.67 : 0.61]}
              rotation={[0, 0, Math.PI]}
            >
              <torusGeometry args={[0.13, 0.025, 8, 24, Math.PI]} />
              <ToonMaterial color="#baffdd" />
            </mesh>
            <mesh position={[0, 1.46, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.34, 12]} />
              <ToonMaterial color="#8faca0" />
            </mesh>
            <mesh position={[0, 1.68, 0]}>
              <sphereGeometry args={[0.11, 20, 16]} />
              <ToonMaterial color="#ffb36b" emissive="#ffb36b" emissiveIntensity={0.25} />
            </mesh>
          </group>
          {props.form === 'Kernel' && (
            <group name="kernel-robot-tools">
              <mesh position={[0, -0.28, 0.51]}>
                <torusGeometry args={[0.22, 0.035, 8, 32]} />
                <ToonMaterial color="#c9fff2" emissive="#56dec9" emissiveIntensity={1.2} />
              </mesh>
              {[-1, 1].map((side) => (
                <group key={side} position={[side * 1.1, -0.37, 0]} rotation={[0, 0, side * -0.15]}>
                  <mesh>
                    <sphereGeometry args={[0.16, 12, 8]} />
                    <ToonMaterial color="#647eb8" />
                  </mesh>
                  <RoundedBox
                    position={[0, -0.3, 0.12]}
                    args={[0.32, 0.46, 0.4]}
                    radius={0.1}
                    smoothness={2}
                  >
                    <ToonMaterial finish="ceramic" color="#fff3d1" />
                  </RoundedBox>
                </group>
              ))}
              {[-0.52, 0.52].map((x) => (
                <mesh key={x} position={[x, -0.83, 0]}>
                  <cylinderGeometry args={[0.12, 0.12, 0.45, 12]} />
                  <ToonMaterial color="#7bd8d0" />
                </mesh>
              ))}
            </group>
          )}
          <mesh
            position={[0, -0.55, 0]}
            scale={props.form === 'Kernel' ? [0.78, 0.85, 1] : [1, 1, 1]}
          >
            <boxGeometry args={[1.45, 0.9, 0.9]} />
            <ToonMaterial finish="ceramic" color="#7193e0" />
          </mesh>
          {[-0.43, 0.43].map((x) => (
            <mesh key={x} position={[x, -1.12, 0.12]}>
              <boxGeometry args={[0.48, 0.25, 0.75]} />
              <ToonMaterial finish="ceramic" color="#ffbd79" />
            </mesh>
          ))}
        </group>
      </group>
      {props.platform !== false && props.cinematic && (
        <mesh name="stage-emissive-ring" position={[0, -1.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.92, 0.025, 8, 64]} />
          <ToonMaterial
            color="#FFC98B"
            emissive="#FFC98B"
            emissiveIntensity={3.2}
            toneMapped={false}
          />
        </mesh>
      )}
      {props.platform !== false && (
        <mesh position={[0, -1.33, 0]}>
          <cylinderGeometry args={[2.05, 2.15, 0.16, 64]} />
          <ToonMaterial color="#273546" />
        </mesh>
      )}
    </group>
  );
}
