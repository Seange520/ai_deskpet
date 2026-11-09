import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useMission } from './missionStore.mjs';
import { POINTS } from './missionData.mjs';
import { inRange } from './mission.mjs';
import { ASSETS, WALLS, DOORS, SIGNS, PROPS, LAMPS, BENCHES, TREES, TILES, assetPath } from './sceneLayout.mjs';

// A 20 m facade and instanced paving. L1 on desktop, L2 on coarse/narrow screens.
function disposeObjects(roots) {
  const geometries = new Set(),
    materials = new Set();
  roots.forEach((root) =>
    root?.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
    }),
  );
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

export default function MissionScene({ maxDpr }) {
  const host = useRef(null),
    markers = useRef({});
  const selected = useMission((s) => s.mission.selected);
  const walkTo = useMission((s) => s.walkTo);
  useEffect(() => {
    const element = host.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      useMission.setState({ error: '无法启动 WebGL，请检查浏览器硬件加速后重试。' });
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', '晴光街三维抢修场景');
    element.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#cbd1bd');
    scene.fog = new THREE.Fog('#cbd1bd', 35, 75);
    scene.add(new THREE.HemisphereLight('#e5edee', '#8f795b', 2));
    const sun = new THREE.DirectionalLight('#ffdab0', 3);
    sun.position.set(-6, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 250);
    const project = new THREE.Vector3();
    function resize() {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      // Fit the full street even on a narrow phone; keep all four touch targets onscreen.
      const scale = Math.max(1, 1.4 / camera.aspect);
      camera.position.set(12 * scale, 12 * scale, 22 * scale);
      scene.fog.near = camera.position.length() + 15;
      scene.fog.far = camera.position.length() + 70;
      camera.lookAt(0, 1, 1.6);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      POINTS.forEach((point) => {
        project.set(point.position[0], 1.9, point.position[2]).project(camera);
        const marker = markers.current[point.id];
        if (marker) {
          marker.style.left = `${((project.x + 1) * width) / 2}px`;
          marker.style.top = `${((1 - project.y) * height) / 2}px`;
        }
      });
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 50),
      new THREE.MeshStandardMaterial({ color: '#b8b29d', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.055;
    ground.receiveShadow = true;
    scene.add(ground);
    renderer.render(scene, camera);
    const keys = new Set();
    const onKeyDown = (event) => {
      if (event.target.closest?.('button, input, select, textarea') || !useMission.getState().ready)
        return;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowLeft',
          'ArrowDown',
          'ArrowRight',
        ].includes(event.code)
      ) {
        event.preventDefault();
        keys.add(event.code);
        useMission.setState({ destination: null });
      }
      if (event.code === 'KeyE' && !event.repeat) {
        event.preventDefault();
        const state = useMission.getState();
        const nearest = POINTS.filter((p) => inRange(state.mission.position, p.id)).sort(
          (a, b) =>
            Math.abs(a.position[0] - state.mission.position[0]) -
            Math.abs(b.position[0] - state.mission.position[0]),
        )[0];
        if (nearest) state.dispatch({ type: 'interact', point: nearest.id });
      }
    };
    const onKeyUp = (event) => keys.delete(event.code);
    const blur = () => keys.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    let disposed = false,
      frame,
      loadedRoots = [],
      firstFrame = true,
      last = performance.now(),
      sampleStart = last,
      frames = 0,
      sync = 0;
    let player,
      particles,
      lampMaterials = [],
      committedPosition;
    const loader = new GLTFLoader();
    const mobile = matchMedia('(pointer: coarse), (max-width: 767px)').matches;
    const lod = mobile ? 2 : 1;
    function instances(root, placements, onlyName) {
      root.updateMatrixWorld(true);
      root.traverse((mesh) => {
        if (!mesh.isMesh || (onlyName && mesh.name !== onlyName)) return;
        const instanced = new THREE.InstancedMesh(mesh.geometry, mesh.material, placements.length);
        const object = new THREE.Object3D(),
          matrix = new THREE.Matrix4();
        placements.forEach(([x, z, rotation = 0], i) => {
          object.position.set(x, 0, z);
          object.rotation.y = rotation;
          object.updateMatrix();
          matrix.multiplyMatrices(object.matrix, mesh.matrixWorld);
          instanced.setMatrixAt(i, matrix);
        });
        instanced.computeBoundingSphere();
        instanced.castShadow = true;
        instanced.receiveShadow = true;
        scene.add(instanced);
      });
    }
    function tick(now) {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const current = useMission.getState(),
        mission = current.mission;
      if (mission.position !== committedPosition) {
        player.position.set(mission.position[0], 0.08, mission.position[1]);
        committedPosition = mission.position;
      }
      let x = player.position.x,
        z = player.position.z;
      const destination = POINTS.find((p) => p.id === current.destination);
      if (destination) {
        const tx = destination.position[0],
          tz = destination.position[2] + 1.1;
        const distance = Math.hypot(tx - x, tz - z),
          amount = Math.min(distance, dt * 7);
        if (distance > 0.06) {
          x += ((tx - x) / distance) * amount;
          z += ((tz - z) / distance) * amount;
        } else {
          x = tx;
          z = tz;
          current.dispatch({ type: 'move', position: [tx, tz] });
          committedPosition = useMission.getState().mission.position;
          current.dispatch({ type: 'interact', point: destination.id });
          useMission.setState({ destination: null });
        }
      } else {
        const dx =
          Number(keys.has('KeyD') || keys.has('ArrowRight')) -
          Number(keys.has('KeyA') || keys.has('ArrowLeft'));
        const dz =
          Number(keys.has('KeyS') || keys.has('ArrowDown')) -
          Number(keys.has('KeyW') || keys.has('ArrowUp'));
        const length = Math.hypot(dx, dz) || 1;
        x += (dx / length) * dt * 5;
        z += (dz / length) * dt * 5;
      }
      x = THREE.MathUtils.clamp(x, -9.5, 9.5);
      z = THREE.MathUtils.clamp(z, 1.7, 6.5);
      sync += dt;
      if (
        sync > 0.06 &&
        Math.abs(x - mission.position[0]) + Math.abs(z - mission.position[1]) > 0.001
      ) {
        current.dispatch({ type: 'move', position: [x, z] });
        committedPosition = useMission.getState().mission.position;
        sync = 0;
      }
      player.position.set(x, 0.08, z);
      const lit = mission.step === 'scored' || mission.orderIndex === 2;
      lampMaterials.forEach((material) => {
        material.emissiveIntensity = lit
          ? 2
          : mission.orderIndex === 1 && mission.step === 'powered'
            ? 0.25 + Math.sin(now / 80) * 0.2
            : 0.02;
      });
      POINTS.forEach((point) => {
        const marker = markers.current[point.id];
        if (marker) marker.dataset.near = String(inRange([x, z], point.id));
      });
      particles.visible = mission.step === 'scored';
      particles.rotation.y += dt * 0.15;
      renderer.render(scene, camera);
      frames++;
      if (firstFrame || now - sampleStart >= 1500) {
        useMission.setState({
          ready: true,
          metrics: {
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            fps: firstFrame ? null : Math.round((frames * 1000) / (now - sampleStart)),
            firstFrameMs: firstFrame
              ? Math.round(performance.now())
              : useMission.getState().metrics.firstFrameMs,
            width: renderer.domElement.width,
            height: renderer.domElement.height,
            lod,
            gpu: renderer.getContext().getParameter(renderer.getContext().RENDERER),
          },
        });
        firstFrame = false;
        frames = 0;
        sampleStart = now;
      }
    }
    async function load() {
      const results = await Promise.allSettled(
        ASSETS.map((name) => loader.loadAsync(assetPath(name, lod))),
      );
      loadedRoots = results.filter((r) => r.status === 'fulfilled').map((r) => r.value.scene);
      if (disposed) {
        disposeObjects(loadedRoots);
        return;
      }
      const failure = results.find((r) => r.status === 'rejected');
      if (failure) {
        useMission.setState({ error: `街景资产加载失败：${failure.reason.message}` });
        return;
      }
      const [wall, lamp, bench, tree, paving, door, sign, props] = loadedRoots;
      instances(wall, WALLS);
      instances(door, DOORS);
      sign.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
      });
      const signObject = sign.clone(true);
      SIGNS.forEach(([x, y, z, rotation = 0]) => {
        const placed = signObject.clone(true);
        placed.position.set(x, y, z);
        placed.rotation.y = rotation;
        scene.add(placed);
      });
      instances(props, PROPS);
      lamp.traverse((o) => {
        if (o.isMesh && o.name.includes('LampHead')) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            m.emissive = new THREE.Color('#ffd68c');
            lampMaterials.push(m);
          });
        }
      });
      instances(lamp, LAMPS);
      instances(bench, BENCHES);
      instances(tree, TREES);
      instances(paving, TILES, 'SM_Paving_Full');
      const boxGeometry = new THREE.BoxGeometry(0.6, 0.85, 0.28);
      const boxMaterial = new THREE.MeshStandardMaterial({
        color: '#3c615d',
        metalness: 0.25,
        roughness: 0.65,
      });
      POINTS.forEach((point) => {
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(...point.position);
        scene.add(box);
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.25, 0.02),
          new THREE.MeshStandardMaterial({ color: point.id === 'switch' ? '#b5543a' : '#e8ddc4' }),
        );
        plate.position.set(point.position[0], 1.2, point.position[2] + 0.15);
        scene.add(plate);
      });
      player = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 0.12, 20),
        new THREE.MeshStandardMaterial({
          color: '#b08a3e',
          emissive: '#7a541c',
          emissiveIntensity: 0.3,
        }),
      );
      scene.add(player);
      const dots = new Float32Array(24 * 3);
      for (let i = 0; i < 24; i++) {
        dots[i * 3] = Math.sin(i * 3.7) * 9;
        dots[i * 3 + 1] = 0.4 + (i % 5) * 0.55;
        dots[i * 3 + 2] = 2 + Math.cos(i * 2.1) * 2;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(dots, 3));
      particles = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({ color: '#ffe8ae', size: 0.09 }),
      );
      scene.add(particles);
      last = sampleStart = performance.now();
      frame = requestAnimationFrame(tick);
    }
    load().catch((error) => {
      if (!disposed) useMission.setState({ error: error.message });
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', blur);
      disposeObjects([scene, ...loadedRoots]);
      renderer.dispose();
      renderer.domElement.remove();
      useMission.setState({ ready: false });
    };
  }, [maxDpr]);
  return (
    <div
      className="mission-scene"
      ref={host}
      tabIndex={0}
      aria-label="街道行走区域，WASD 移动，E 交互"
    >
      {POINTS.map((point) => (
        <button
          key={point.id}
          ref={(el) => {
            markers.current[point.id] = el;
          }}
          className="mission-marker"
          data-testid={`point-${point.id}`}
          data-selected={selected === point.id}
          aria-label={`前往${point.label}`}
          onClick={() => {
            walkTo(point.id);
            host.current.focus({ preventScroll: true });
          }}
        >
          <span>{point.short}</span>
          {point.label}
          <small>点击走近 / E</small>
        </button>
      ))}
    </div>
  );
}
