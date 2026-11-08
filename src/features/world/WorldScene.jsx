import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import RockFinish from './RockFinish';
import { ANCHORS, VIEWS, WORLD_LAYOUT } from './poi';
import IslandSkin from './IslandSkin';
import SkinEcology from './SkinEcology';
import { TempleSkin, BrokenSteps } from './RefinedAssets';
import DenseRelics from './DenseRelics';
import BlenderAssets from './BlenderAssets';
import WorldAmbience from './WorldAmbience';

// Stone paving is segmented in material space, preserving the original walkable ring.
function paving(shader) {
  shader.vertexShader =
    'varying vec2 pavingCoord;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\npavingCoord=position.xy;',
    );
  shader.fragmentShader =
    'varying vec2 pavingCoord;\n' +
    shader.fragmentShader.replace(
      '#include <map_fragment>',
      '#include <map_fragment>\nfloat angular=abs(fract(atan(pavingCoord.y,pavingCoord.x)*20.37183)-.5); float radial=abs(fract((length(pavingCoord)-14.9)*.91)-.5); float seam=1.-smoothstep(.008,.035,min(angular,radial)); diffuseColor.rgb*=1.-seam*.55;',
    );
}
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
    <RoundedBox
      args={scale}
      radius={Math.min(...scale) * 0.1}
      smoothness={4}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <RockFinish color={color} />
    </RoundedBox>
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

      <group name="p9-meso">
        <IslandSkin id="hub" accent="#f9bf94" hub />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
          <ringGeometry args={[14.9, 17.1, 96]} />
          <RockFinish color="#526476" onBeforeCompile={paving} />
        </mesh>
        {ANCHORS.map((a) => (
          <group key={a.id} position={a.position}>
            <IslandSkin id={a.id} accent={a.color} />
            <group rotation={[0, a.id === 'hardware' ? Math.PI / 2 : 0, 0]}>
              <TempleSkin accent={a.color} />
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
            <BrokenSteps position={[-2.3, 0.015, 2.2]} scale={0.9} />
            <BrokenSteps position={[-3, 0.015, 1.5]} scale={0.65} />
            <BrokenSteps position={[2.5, 0.015, 1.7]} scale={0.75} />
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
      <SkinEcology paused={paused} />
      <DenseRelics />
      {terrainWrapper ? terrainWrapper(geometry) : geometry}
    </>
  );
}
