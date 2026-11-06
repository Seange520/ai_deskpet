import { useLayoutEffect, useState } from 'react';
import { createPortal, useThree } from '@react-three/fiber';
import { Lightformer } from '@react-three/drei';
import { CubeCamera, HalfFloatType, PMREMGenerator, Scene, WebGLCubeRenderTarget } from 'three';

export default function EnvironmentMap({ intensity }) {
  const { gl, scene, invalidate } = useThree();
  const [lights] = useState(() => new Scene());

  useLayoutEffect(() => {
    const { environment, environmentIntensity } = scene;
    const source = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
    const camera = new CubeCamera(0.1, 1000, source);
    const generator = new PMREMGenerator(gl);
    const autoClear = gl.autoClear;
    let filtered;
    try {
      gl.autoClear = true;
      camera.update(gl, lights);
      // Own the CubeUV target so it can be released even on Three r170's render-target cache path.
      filtered = generator.fromCubemap(source.texture);
    } finally {
      gl.autoClear = autoClear;
      generator.dispose();
      source.texture.dispose();
      source.dispose();
    }
    scene.environment = filtered.texture;
    scene.environmentIntensity = intensity;
    invalidate();
    return () => {
      if (scene.environment === filtered.texture) {
        scene.environment = environment;
        scene.environmentIntensity = environmentIntensity;
      }
      filtered.dispose();
      invalidate();
    };
  }, [gl, scene, lights, intensity, invalidate]);

  return createPortal(
    <>
      <Lightformer
        form="rect"
        color="#ffcf9e"
        intensity={3}
        position={[0, 4, 4]}
        scale={[5, 3, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        color="#8ea0d8"
        intensity={2}
        position={[-4, 2, -3]}
        scale={[3, 5, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        color="#ffb0a8"
        intensity={1.5}
        position={[4, 1, 1]}
        scale={[2, 4, 1]}
        target={[0, 0, 0]}
      />
    </>,
    lights,
  );
}
