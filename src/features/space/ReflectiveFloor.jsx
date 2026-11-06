import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { HalfFloatType, WebGLRenderTarget } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { BlurPass } from '@react-three/drei/materials/BlurPass.js';
import { MeshReflectorMaterial } from '@react-three/drei/materials/MeshReflectorMaterial.js';

const resolution = 256;
const blur = [280, 90];

// Own the targets explicitly because Drei 9.122's React wrapper leaves them allocated on unmount.
export default function ReflectiveFloor() {
  const floor = useRef(null);
  const resources = useRef(null);

  useLayoutEffect(() => {
    const mesh = floor.current;
    const capture = new Reflector(mesh.geometry, {
      textureWidth: resolution,
      textureHeight: resolution,
      multisample: 0,
    });
    const blurred = new WebGLRenderTarget(resolution, resolution, {
      type: HalfFloatType,
      depthBuffer: false,
    });
    const blurPass = new BlurPass({ resolution, width: blur[0], height: blur[1] });
    const material = new MeshReflectorMaterial();
    material.color.set('#59676d');
    material.roughness = 0.76;
    material.metalness = 0.16;
    material.defines.USE_BLUR = '';
    material.hasBlur = true;
    material.mirror = 0.55;
    material.mixBlur = 1;
    material.mixStrength = 3.8;
    material.textureMatrix = capture.material.uniforms.textureMatrix.value;
    material.tDiffuse = capture.getRenderTarget().texture;
    material.tDiffuseBlur = blurred.texture;

    const fallback = mesh.material;
    mesh.material = material;
    resources.current = { capture, blurred, blurPass };
    return () => {
      resources.current = null;
      mesh.material = fallback;
      capture.dispose();
      blurred.dispose();
      blurPass.renderTargetA.dispose();
      blurPass.renderTargetB.dispose();
      blurPass.screen.geometry.dispose();
      blurPass.convolutionMaterial.dispose();
      material.dispose();
    };
  }, []);

  useFrame(({ gl, scene, camera }) => {
    if (!resources.current) return;
    const { capture, blurred, blurPass } = resources.current;
    const mesh = floor.current;
    const target = gl.getRenderTarget();
    const xrEnabled = gl.xr.enabled;
    const shadowAutoUpdate = gl.shadowMap.autoUpdate;
    mesh.updateWorldMatrix(true, false);
    camera.updateWorldMatrix(true, false);
    capture.matrixWorld.copy(mesh.matrixWorld);

    mesh.visible = false;
    try {
      capture.onBeforeRender(gl, scene, camera);
      blurPass.render(gl, capture.getRenderTarget(), blurred);
    } finally {
      mesh.visible = true;
      gl.xr.enabled = xrEnabled;
      gl.shadowMap.autoUpdate = shadowAutoUpdate;
      gl.setRenderTarget(target);
    }
  });

  return (
    <mesh
      name="space-reflective-floor"
      position={[0, -1.16, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      ref={floor}
    >
      <circleGeometry args={[85, 96]} />
      <meshStandardMaterial color="#211b34" roughness={0.95} />
    </mesh>
  );
}
