export default function IslandMarker({ color, children }) {
  return (
    <mesh position={[0, 1.18, 0]} rotation={[0.3, 0.45, 0.2]}>
      {children}
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        metalness={0.58}
        roughness={0.23}
        clearcoat={1}
      />
    </mesh>
  );
}
