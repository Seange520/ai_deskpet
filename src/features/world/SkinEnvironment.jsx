import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator, PCFSoftShadowMap } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export default function SkinEnvironment() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment,
      shadows = gl.shadowMap.enabled,
      type = gl.shadowMap.type;
    const generator = new PMREMGenerator(gl),
      room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    scene.environment = target.texture;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = true;
    invalidate();
    return () => {
      scene.environment = previous;
      gl.shadowMap.enabled = shadows;
      gl.shadowMap.type = type;
      target.dispose();
      room.dispose();
      generator.dispose();
    };
  }, [gl, scene, invalidate]);
  return (
    <>
      <directionalLight position={[5, 4, -8]} intensity={0.85} color="#bddbff" />
      <directionalLight
        position={[-12, 22, 8]}
        intensity={1.15}
        color="#ffdcad"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-far={85}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
    </>
  );
}
