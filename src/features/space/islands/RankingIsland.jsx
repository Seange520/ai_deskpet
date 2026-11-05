import IslandMarker from './IslandMarker';

export default function RankingIsland({ island }) {
  return (
    <IslandMarker color={island.accent}>
      <dodecahedronGeometry args={[1.16, 0]} />
    </IslandMarker>
  );
}
