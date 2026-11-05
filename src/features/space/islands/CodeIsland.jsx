import IslandMarker from './IslandMarker';

export default function CodeIsland({ island }) {
  return (
    <IslandMarker color={island.accent}>
      <octahedronGeometry args={[1.25, 0]} />
    </IslandMarker>
  );
}
