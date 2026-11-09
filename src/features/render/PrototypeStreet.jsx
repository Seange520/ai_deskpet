import { createContext, useContext } from 'react';
import { BackSide, AdditiveBlending } from 'three';
import ToonMaterial from '../npr/ToonMaterial';

const Finish = createContext({ toon: true, outline: true });
// Offset after model scaling to keep wide slabs and facial details at the same ink width.
const outlineVertex = `void main(){
vec4 p=modelViewMatrix*vec4(position,1.0);
p.xyz+=normalize(normalMatrix*normal)*0.025;
gl_Position=projectionMatrix*p;
}`;
const outlineFragment = `void main(){gl_FragColor=vec4(0.055,0.075,0.14,1.0);}`;

function Shape({
  p = [0, 0, 0],
  s = [1, 1, 1],
  r,
  color = '#e4dfc5',
  shape = 'box',
  finish = 'matte',
  glow = false,
}) {
  const { toon, outline } = useContext(Finish);
  const geometry = () =>
    shape === 'sphere' ? (
      <sphereGeometry args={[0.5, 20, 12]} />
    ) : shape === 'cone' ? (
      <coneGeometry args={[0.5, 1, 8]} />
    ) : shape === 'cylinder' ? (
      <cylinderGeometry args={[0.5, 0.5, 1, 12]} />
    ) : (
      <boxGeometry />
    );
  return (
    <group position={p} rotation={r} scale={s}>
      <mesh castShadow receiveShadow>
        {geometry()}
        {glow ? (
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2}
            toneMapped={false}
          />
        ) : toon ? (
          <ToonMaterial color={color} finish={finish} />
        ) : (
          <meshStandardMaterial
            color={color}
            roughness={finish === 'ceramic' ? 0.28 : 0.88}
            metalness={0.05}
          />
        )}
      </mesh>
      {outline && !glow && (
        <mesh name="r1-ink-shell">
          {geometry()}
          <shaderMaterial
            vertexShader={outlineVertex}
            fragmentShader={outlineFragment}
            side={BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

function House({ x, z, index, night }) {
  const wall = ['#f4cc91', '#9dcfc5', '#cbb5da', '#efb4a2'][index % 4];
  const height = 3.8 + (index % 3) * 0.55;
  return (
    <group position={[x, 0, z]}>
      <Shape p={[0, height / 2, 0]} s={[3.1, height, 2.7]} color={wall} />
      <Shape
        p={[0, height + 0.75, 0]}
        s={[4.6, 1.7, 4.1]}
        r={[0, Math.PI / 4, 0]}
        shape="cone"
        color={index % 2 ? '#4f7b90' : '#ae6c76'}
      />
      <Shape p={[0, 0.24, 0]} s={[3.35, 0.48, 2.95]} color="#b5ada3" />
      {[1.1, 2.7].map((y) =>
        [-0.83, 0.83].map((wx) => (
          <group key={`${y}-${wx}`}>
            <Shape p={[wx, y, 1.38]} s={[0.85, 1.05, 0.12]} color="#4b6676" />
            <Shape
              p={[wx, y, 1.46]}
              s={[0.64, 0.82, 0.04]}
              color={night ? '#ffcf85' : '#a1dce6'}
              glow={night}
            />
            <Shape p={[wx, y - 0.58, 1.49]} s={[1.02, 0.13, 0.26]} color="#fff0d1" />
          </group>
        )),
      )}
      <Shape p={[0, 0.83, 1.4]} s={[0.6, 1.4, 0.16]} color="#4a6376" />
      <Shape
        p={[0, 1.7, 1.8]}
        s={[2.7, 0.13, 1.0]}
        r={[0.15, 0, 0]}
        color={index % 2 ? '#e8b85d' : '#699d9c'}
      />
      <Shape p={[0.9, height + 0.75, -0.25]} s={[0.42, 1.65, 0.5]} color="#ede2cd" />
    </group>
  );
}

function Pet({ p, color, alternate = false }) {
  return (
    <group
      position={p}
      rotation={[0, alternate ? -0.35 : 0.25, 0]}
      name={alternate ? 'r1-pet-coral' : 'r1-pet-mint'}
    >
      <Shape p={[0, 0.9, 0]} s={[1.45, 1.25, 1.05]} shape="sphere" color={color} finish="ceramic" />
      <Shape
        p={[0, 1.75, 0]}
        s={[1.7, 1.35, 1.2]}
        shape="sphere"
        color="#fff0d8"
        finish="ceramic"
      />
      <Shape p={[0, 1.77, 0.5]} s={[1.2, 0.72, 0.24]} shape="sphere" color="#243e54" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Shape
            p={[side * 0.27, 1.83, 0.64]}
            s={[0.13, 0.23, 0.07]}
            shape="sphere"
            color="#a0ffe5"
            glow
          />
          <Shape
            p={[side * 0.4, 0.25, 0.1]}
            s={[0.48, 0.36, 0.72]}
            shape="sphere"
            color="#3b586b"
          />
          <Shape
            p={[side * 0.88, 0.94, 0]}
            s={[0.32, 0.68, 0.36]}
            r={[0, 0, side * -0.3]}
            shape="sphere"
            color={color}
          />
          <Shape
            p={[side * 0.53, 2.45, 0]}
            s={[0.32, alternate ? 0.85 : 0.5, 0.35]}
            r={[0, 0, side * -0.22]}
            shape="sphere"
            color={color}
          />
        </group>
      ))}
      <Shape
        p={[0, 0.97, 0.49]}
        s={[0.45, 0.38, 0.08]}
        shape="cylinder"
        r={[Math.PI / 2, 0, 0]}
        color="#ffe0a2"
        glow
      />
    </group>
  );
}

function Tower({ night }) {
  return (
    <group position={[0, 0, -10]} name="r1-landmark-tower">
      <Shape p={[0, 0.3, 0]} s={[4, 0.6, 4]} color="#c6d0ce" />
      <Shape p={[0, 3.0, 0]} s={[2.6, 5.4, 2.6]} color="#f3e3c3" />
      {[1.1, 4.9, 6.9].map((y) => (
        <Shape key={y} p={[0, y, 0]} s={[3.1, 0.26, 3.1]} color="#6f999d" />
      ))}
      <Shape p={[0, 6, 0]} s={[2.2, 1.9, 2.2]} color="#7ca5b2" />
      <Shape
        p={[0, 6, 1.15]}
        s={[1.25, 1.25, 0.12]}
        shape="cylinder"
        r={[Math.PI / 2, 0, 0]}
        color="#ffe6a9"
        glow={night}
      />
      <Shape p={[0, 6.15, 1.24]} s={[0.08, 0.43, 0.03]} r={[0, 0, -0.4]} color="#36586b" />
      <Shape
        p={[0, 7.9, 0]}
        s={[4.4, 2.25, 4.4]}
        r={[0, Math.PI / 4, 0]}
        shape="cone"
        color="#4c8f9d"
      />
      <Shape p={[0, 9.35, 0]} s={[0.12, 1.25, 0.12]} color="#e5bb72" />
      <Shape p={[0, 10.05, 0]} s={[0.42, 0.65, 0.42]} shape="sphere" color="#b4ffe2" glow />
    </group>
  );
}

export default function PrototypeStreet({ toon, outline, day }) {
  const night = day < 0.25;
  return (
    <Finish.Provider value={{ toon, outline }}>
      <group name="r1-street">
        <Shape p={[0, -0.55, -2]} s={[19, 1, 29]} color="#8aab9d" />
        <Shape p={[0, -1.3, -2]} s={[17, 0.65, 27]} color="#6b8291" />
        <Shape p={[0, 0, -1]} s={[5.8, 0.12, 25]} color="#d9ccab" />
        {[-1, 1].map((side) => (
          <Shape key={side} p={[side * 3.05, 0.12, -1]} s={[0.35, 0.28, 25]} color="#fff0cf" />
        ))}
        {Array.from({ length: 19 }, (_, i) => (
          <Shape key={i} p={[0, 0.075, 10 - i * 1.2]} s={[5.55, 0.025, 0.035]} color="#b3a98d" />
        ))}
        {[-1, 1].flatMap((side) =>
          [0, 1, 2].map((i) => (
            <House
              key={`${side}-${i}`}
              x={side * 5.25}
              z={5 - i * 6.0}
              index={i + (side > 0 ? 1 : 0)}
              night={night}
            />
          )),
        )}
        <Tower night={night} />
        <Pet p={[-1.3, 0.18, 5.7]} color="#79cbbb" />
        <Pet p={[1.3, 0.18, 4.5]} color="#efa395" alternate />
        {[-1, 1].flatMap((side) =>
          [0, 1, 2].map((i) => (
            <group key={`${side}-${i}`} position={[side * 3.5, 0, 9.8 - i * 7]}>
              <Shape p={[0, 1.5, 0]} s={[0.12, 3.0, 0.12]} color="#456575" />
              <Shape
                p={[0, 3.05, 0]}
                s={[0.52, 0.62, 0.52]}
                color={night ? '#ffd698' : '#fff0d1'}
                glow={night}
              />
              <Shape p={[0, 3.45, 0]} s={[0.76, 0.3, 0.76]} shape="cone" color="#54858b" />
            </group>
          )),
        )}
        {[-1, 1].flatMap((side) =>
          [0, 1, 2, 3].map((i) => (
            <group key={`${side}-${i}`} position={[side * 8, 0, 9 - i * 7]}>
              <Shape p={[0, 0.8, 0]} s={[0.23, 1.6, 0.23]} color="#9c7f6b" />
              <Shape
                p={[0, 2.0, 0]}
                s={[1.8, 2.6, 1.8]}
                shape="cone"
                color={i % 2 ? '#77b69c' : '#96c5a2'}
              />
            </group>
          )),
        )}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 4, 5.5, -2]} rotation={[0, 0, side * -0.32]}>
            <coneGeometry args={[2.4, 10, 24, 1, true]} />
            <meshBasicMaterial
              color="#ffe6b4"
              transparent
              opacity={day * 0.025}
              depthWrite={false}
              blending={AdditiveBlending}
              side={BackSide}
            />
          </mesh>
        ))}
      </group>
    </Finish.Provider>
  );
}
