import IslandMarker from './IslandMarker';

export default function HardwareIsland({ island }) {
  return (
    <IslandMarker color={island.accent}>
      <icosahedronGeometry args={[1.15, 0]} />
    </IslandMarker>
  );
}
