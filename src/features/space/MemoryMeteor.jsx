import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Vector3 } from 'three';
import { useLorePresentation } from './useLorePresentation';
import { useSpaceStore, isSpaceTransition } from './spaceStore';

export default function MemoryMeteor({ overlay, paused, reduced }) {
  const group = useRef();
  const clock = useMemo(() => ({ elapsed: 0, next: 150, age: -1, cycle: 0 }), []);
  const point = useMemo(() => new Vector3(), []);
  const uniforms = useMemo(() => ({ opacity: { value: 0 } }), []);
  const evolving = useLorePresentation((s) => s.evolving);
  useEffect(
    () => () => {
      if (overlay.current) overlay.current.hidden = true;
    },
    [overlay],
  );
  useFrame(({ camera, size, invalidate }, delta) => {
    const button = overlay.current;
    const frozen =
      paused || reduced || evolving || isSpaceTransition(useSpaceStore.getState().phase);
    if (!frozen) {
      const dt = Math.min(delta, 0.06);
      clock.elapsed += dt;
      if (clock.age < 0 && clock.elapsed >= clock.next) clock.age = 0;
      if (clock.age >= 0) clock.age += dt;
      if (clock.age > 7) {
        clock.age = -1;
        clock.cycle++;
        clock.next = clock.elapsed + 150 + ((clock.cycle * 37) % 81);
      }
      invalidate();
    }
    const visible = !frozen && clock.age >= 0;
    group.current.visible = visible;
    if (button) button.hidden = !visible;
    if (!visible) return;
    const t = clock.age / 7;
    group.current.position
      .set(-26 + t * 51, 19 - t * 12, -62)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.rotateZ(-0.25);
    uniforms.opacity.value = Math.min(1, t * 9, (1 - t) * 9);
    point
      .copy(group.current.position)
      .add(new Vector3(3, 0, 0).applyQuaternion(camera.quaternion))
      .project(camera);
    if (button) {
      button.style.left = `${(point.x * 0.5 + 0.5) * size.width}px`;
      button.style.top = `${(-point.y * 0.5 + 0.5) * size.height}px`;
    }
  }, -0.15);
  return (
    <group name="seventh-memory-meteor" ref={group} visible={false} userData={{ clock }}>
      <mesh renderOrder={2}>
        <planeGeometry args={[12, 1.2]} />
        <shaderMaterial
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          vertexShader={
            'varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
          }
          fragmentShader={`uniform float opacity; varying vec2 p; void main(){
          float tail=pow(p.x,2.0)*exp(-abs(p.y-.5)*40.0);
          float star=exp(-length((p-vec2(.91,.5))*vec2(12.,1.2))*26.);
          float nodes=pow(.5+.5*cos(p.x*44.),18.)*exp(-abs(p.y-.5)*20.)*p.x*.25;
          gl_FragColor=vec4(mix(vec3(.55,.8,1.7),vec3(2.8,2.1,1.3),star), (tail+star+nodes)*opacity);
        }`}
        />
      </mesh>
    </group>
  );
}
