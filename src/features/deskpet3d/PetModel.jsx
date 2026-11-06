import { useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import PetAffection from './PetAffection';
import PetContactShadow from './PetContactShadow';
import { usePetAnimation } from './usePetAnimation';

function warmFresnel(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
    float viewEdge = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    totalEmissiveRadiance += vec3(1.0, 0.39, 0.16) * pow(viewEdge, 2.6) * 0.58;`,
  );
}
export default function PetModel(props) {
  const { body, head, eyes, eyeMeshes } = usePetAnimation(props);
  const ground = useRef(null);
  return (
    <group>
      <group ref={ground}>
        <PetContactShadow
          body={body}
          ground={ground}
          travelRoot={props.travelRoot}
          paused={props.paused}
          reduced={props.reducedMotion}
        />
        <group ref={body} name="command-pet">
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
              args={[1.85, 1.3, 1.05]}
              radius={0.1}
              smoothness={3}
            >
              <meshPhysicalMaterial
                name="pet-shell"
                color="#F3EDE6"
                roughness={0.28}
                metalness={0.06}
                clearcoat={props.tier === 1 ? 0 : 1}
                clearcoatRoughness={0.065}
                onBeforeCompile={warmFresnel}
              />
            </RoundedBox>
            <mesh position={[0, 0.65, 0.54]}>
              <boxGeometry args={[1.48, 0.92, 0.07]} />
              <meshPhysicalMaterial
                color="#221B2E"
                roughness={0.19}
                clearcoat={props.tier === 1 ? 0 : 0.6}
              />
            </mesh>
            {[-0.36, 0.36].map((x) => (
              <mesh
                key={x}
                ref={(mesh) => {
                  eyeMeshes.current[x < 0 ? 0 : 1] = mesh;
                }}
                position={[x, 0.75, 0.61]}
                scale={[0.75, 1.6, 0.55]}
              >
                <sphereGeometry args={[0.13, 24, 16]} />
                <meshPhysicalMaterial
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
            <mesh position={[0, 0.4, 0.61]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.13, 0.025, 8, 24, Math.PI]} />
              <meshPhysicalMaterial color="#baffdd" />
            </mesh>
            <mesh position={[0, 1.46, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.34, 12]} />
              <meshPhysicalMaterial color="#8faca0" />
            </mesh>
            <mesh position={[0, 1.68, 0]}>
              <sphereGeometry args={[0.11, 20, 16]} />
              <meshPhysicalMaterial color="#ffb36b" emissive="#ffb36b" emissiveIntensity={0.25} />
            </mesh>
          </group>
          <mesh position={[0, -0.55, 0]}>
            <boxGeometry args={[1.45, 0.9, 0.9]} />
            <meshPhysicalMaterial
              color="#6B6398"
              roughness={0.33}
              metalness={0.16}
              clearcoat={props.tier === 1 ? 0 : 0.86}
              clearcoatRoughness={0.085}
              onBeforeCompile={warmFresnel}
            />
          </mesh>
          {[-0.43, 0.43].map((x) => (
            <mesh key={x} position={[x, -1.12, 0.12]}>
              <boxGeometry args={[0.48, 0.25, 0.75]} />
              <meshPhysicalMaterial
                color="#e9a970"
                roughness={0.29}
                metalness={0.16}
                clearcoat={props.tier === 1 ? 0 : 0.65}
                clearcoatRoughness={0.1}
                onBeforeCompile={warmFresnel}
              />
            </mesh>
          ))}
        </group>
      </group>
      {props.platform !== false && props.cinematic && (
        <mesh name="stage-emissive-ring" position={[0, -1.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.92, 0.025, 8, 64]} />
          <meshPhysicalMaterial
            color="#FFC98B"
            emissive="#FFC98B"
            emissiveIntensity={3.2}
            toneMapped={false}
            roughness={0.2}
            clearcoat={1}
          />
        </mesh>
      )}
      {props.platform !== false && (
        <mesh position={[0, -1.33, 0]}>
          <cylinderGeometry args={[2.05, 2.15, 0.16, 64]} />
          <meshPhysicalMaterial color="#273546" roughness={0.43} metalness={0.52} />
        </mesh>
      )}
    </group>
  );
}
