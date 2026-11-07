import ToonMaterial from '../npr/ToonMaterial';
export default function LoreObjects() {
  return (
    <group name="seventh-checksum-artifacts">
      <group name="echo-council-receiver" position={[17.9, 0.55, 1.8]} rotation={[0, 0.3, -0.16]}>
        <mesh>
          <boxGeometry args={[0.65, 0.3, 0.5]} />
          <ToonMaterial color="#717c95" />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24, 0.045, 6, 20, Math.PI * 1.7]} />
          <ToonMaterial color="#b4ffdd" emissive="#69d6ba" emissiveIntensity={0.9} />
        </mesh>
      </group>
      <group name="unclosed-loop-remnant" position={[1.7, 0.6, -14.3]} rotation={[0.3, 0, 0.3]}>
        <mesh>
          <boxGeometry args={[0.85, 0.15, 0.6]} />
          <ToonMaterial color="#42466b" />
        </mesh>
        <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.035, 6, 24, Math.PI * 1.85]} />
          <ToonMaterial color="#cab4ff" emissive="#9380e0" emissiveIntensity={1.1} />
        </mesh>
      </group>
    </group>
  );
}
