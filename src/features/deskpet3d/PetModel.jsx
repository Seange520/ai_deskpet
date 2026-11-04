import PetAffection from './PetAffection';
import { usePetAnimation } from './usePetAnimation';

// Geometry only; behavior and refs are provided by the Canvas-local animation hook.
export default function PetModel(props) {
  const { body, head, eyes, eyeMeshes } = usePetAnimation(props);
  return (
    <group>
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
          {props.petting > 0 &&
            !props.paused &&
            !props.interaction.dark &&
            !props.interaction.sleeping && (
              <PetAffection burst={props.petting} reducedMotion={props.reducedMotion} />
            )}
          <mesh position={[0, 0.65, 0]}>
            <boxGeometry args={[1.85, 1.3, 1.05]} />
            <meshStandardMaterial color="#d8d9c2" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.65, 0.54]}>
            <boxGeometry args={[1.48, 0.92, 0.07]} />
            <meshStandardMaterial color="#193b35" roughness={0.7} />
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
              <meshStandardMaterial
                ref={(material) => {
                  eyes.current[x < 0 ? 0 : 1] = material;
                }}
                name="command-eye"
                color="#baffdd"
                emissive="#6ee7b7"
                emissiveIntensity={0.15}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.4, 0.61]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.13, 0.025, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#baffdd" />
          </mesh>
          <mesh position={[0, 1.46, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.34, 12]} />
            <meshStandardMaterial color="#8faca0" />
          </mesh>
          <mesh position={[0, 1.68, 0]}>
            <sphereGeometry args={[0.11, 20, 16]} />
            <meshStandardMaterial color="#ffb36b" emissive="#ffb36b" emissiveIntensity={0.25} />
          </mesh>
        </group>
        <mesh position={[0, -0.55, 0]}>
          <boxGeometry args={[1.45, 0.9, 0.9]} />
          <meshStandardMaterial color="#8faca0" roughness={0.65} />
        </mesh>
        {[-0.43, 0.43].map((x) => (
          <mesh key={x} position={[x, -1.12, 0.12]}>
            <boxGeometry args={[0.48, 0.25, 0.75]} />
            <meshStandardMaterial color="#cfb583" roughness={0.6} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, -1.33, 0]}>
        <cylinderGeometry args={[2.05, 2.15, 0.16, 64]} />
        <meshStandardMaterial color="#22383f" roughness={0.8} />
      </mesh>
    </group>
  );
}
