import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { ANCHORS, VIEWS, WORLD_LAYOUT } from './poi';
import ToonMaterial from '../npr/ToonMaterial';
import IslandDeck from '../space/IslandDeck';
import BlenderAssets from './BlenderAssets';
import WorldAmbience from './WorldAmbience';

// Static construction views own the camera exclusively. TravelRig is unmounted.
function SurveyCamera({ view }) {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    const pose = VIEWS.find((v) => v.id === view) || VIEWS[0];
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.fov = WORLD_LAYOUT.fov;
    camera.far = 165;
    camera.updateProjectionMatrix();
    camera.userData.cameraOwner = 'p9-survey';
    invalidate();
    return () => {
      delete camera.userData.cameraOwner;
    };
  }, [camera, invalidate, view]);
  return null;
}
function Box({ position, scale, color = '#89959e', rotation }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <boxGeometry />
      <ToonMaterial color={color} />
    </mesh>
  );
}
function Symbol({ anchor }) {
  const color = anchor.color;
  if (anchor.symbol === 'book')
    return (
      <group>
        {[-1, 1].map((s) => (
          <Box
            key={s}
            position={[s * 1.05, 1.3, 0]}
            scale={[2.1, 0.35, 3.2]}
            rotation={[0, 0, s * 0.32]}
            color={color}
          />
        ))}
        <Box position={[0, 0.6, 0]} scale={[3, 1, 2]} />
      </group>
    );
  if (anchor.symbol === 'chip')
    return (
      <group>
        <Box position={[0, 2, 0]} scale={[3, 3.7, 0.8]} rotation={[0, 0, -0.18]} color={color} />
        {[-1, 1].flatMap((s) =>
          [0.7, 1.6, 2.5, 3.4].map((y) => (
            <Box key={s + ':' + y} position={[s * 1.9, y, 0]} scale={[0.8, 0.2, 0.25]} />
          )),
        )}
      </group>
    );
  if (anchor.symbol === 'data')
    return (
      <group>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            position={[(i - 1) * 1.3, 2.5 - i * 0.55, -i * 0.7]}
            scale={[0.8, 5 - i * 1.1, 0.45]}
            color={color}
          />
        ))}
      </group>
    );
  return (
    <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[2.6, 5, 4]} />
      <ToonMaterial color={color} />
    </mesh>
  );
}
export default function WorldScene({
  view,
  survey = true,
  terrainWrapper,
  colliderWrapper,
  paused = false,
}) {
  const geometry = (
    <group name="p9-world-graybox" userData={{ phase: 'P0', units: 'metres' }}>
      {survey && <SurveyCamera view={view} />}

      <group name="p9-macro">
        {/* Deliberately offset beacons leave each island symbol readable. */}
        {ANCHORS.map((a) => (
          <group key={a.id} position={a.position}>
            <Box position={[3.5, 6, -2.8]} scale={[0.22, 12, 0.22]} color={a.color} />
          </group>
        ))}
      </group>
      <group name="p9-meso">
        <group scale={[1.25, 1, 1.25]}>
          <IslandDeck island={{ id: 'dashboard', accent: '#f9bf94' }} detailed tier={3} />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
          <ringGeometry args={[14.9, 17.1, 96]} />
          <ToonMaterial color="#667d86" side={DoubleSide} />
        </mesh>
        {ANCHORS.map((a) => (
          <group key={a.id} position={a.position}>
            <group scale={[1.5, 1, 1.5]}>
              <IslandDeck island={{ id: a.id, accent: a.color }} detailed tier={3} />
            </group>
            <group rotation={[0, a.id === 'hardware' ? Math.PI / 2 : 0, 0]}>
              <Symbol anchor={a} />
            </group>
          </group>
        ))}
        {ANCHORS.map((a) => (
          <Box
            key={a.id}
            position={[a.position[0] / 2, -0.14, a.position[2] / 2]}
            scale={a.position[0] ? [9, 0.24, 2.4] : [2.4, 0.24, 9]}
            color="#748b96"
          />
        ))}
      </group>
      <group name="p9-micro">
        {ANCHORS.map((a) => (
          <group key={a.id} position={a.position}>
            <Box position={[-2.3, 0.45, 2.2]} scale={[0.6, 0.9, 0.6]} color={a.color} />
            <Box position={[-3, 0.2, 1.5]} scale={[0.8, 0.4, 0.7]} />
            <Box position={[2.5, 0.65, 1.7]} scale={[0.28, 1.3, 0.28]} color={a.color} />
          </group>
        ))}
      </group>
    </group>
  );
  return (
    <>
      <color attach="background" args={['#181e35']} />
      <fogExp2 attach="fog" args={['#263451', 0.009]} />
      <WorldAmbience paused={paused} />
      <BlenderAssets colliderWrapper={colliderWrapper} />
      {terrainWrapper ? terrainWrapper(geometry) : geometry}
    </>
  );
}
