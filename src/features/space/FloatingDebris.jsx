import ToonMaterial from '../npr/ToonMaterial';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DynamicDrawUsage, Object3D } from 'three';

function fraction(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export default function FloatingDebris({ tier, paused, reduced }) {
  const count = tier === 3 ? 320 : 120;
  const mesh = useRef(null);
  const elapsed = useRef(0);
  const frame = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const rocks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = i * 2.399963 + fraction(i, 1) * 0.15;
        const radius = 23 + 35 * fraction(i, 2);
        const size = 0.12 + fraction(i, 3) ** 2 * (i % 12 === 0 ? 1.02 : 0.5);
        return {
          x: Math.cos(angle) * radius,
          y: 0.65 + fraction(i, 4) ** 1.6 * 10.5,
          z: Math.sin(angle) * radius,
          size,
          stretch: 0.48 + fraction(i, 5) * 0.64,
          spin: (fraction(i, 6) - 0.5) * 0.19,
          angle,
        };
      }),
    [count],
  );

  function pose(rock, index) {
    dummy.position.set(rock.x, rock.y, rock.z);
    dummy.rotation.set(rock.angle + elapsed.current * rock.spin, index * 0.83, index * 0.42);
    dummy.scale.set(rock.size, rock.size * rock.stretch, rock.size * 0.78);
    dummy.updateMatrix();
    mesh.current.setMatrixAt(index, dummy.matrix);
  }

  useLayoutEffect(() => {
    const instanced = mesh.current;
    const shade = new Color();
    instanced.instanceMatrix.setUsage(DynamicDrawUsage);
    for (const [index, rock] of rocks.entries()) {
      pose(rock, index);
      shade.set(index % 7 === 0 ? '#56697b' : '#30384b');
      shade.multiplyScalar(0.68 + fraction(index, 7) * 0.55);
      instanced.setColorAt(index, shade);
    }
    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceColor.needsUpdate = true;
    instanced.computeBoundingSphere();
    instanced.boundingSphere.radius += 0.5;
  }, [rocks]);

  useFrame((_, delta) => {
    if (paused || reduced) return;
    elapsed.current += Math.min(delta, 0.05);
    if (frame.current++ % (tier === 3 ? 2 : 3) !== 0) return;
    for (const [index, rock] of rocks.entries()) pose(rock, index);
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="space-floating-debris">
      <instancedMesh name="valley-asteroids" ref={mesh} args={[null, null, count]}>
        <icosahedronGeometry args={[1, 0]} />
        <ToonMaterial flatShading color="#bac7d6" emissive="#495d77" emissiveIntensity={0.25} />
      </instancedMesh>
    </group>
  );
}
