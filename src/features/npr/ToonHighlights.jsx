import DepthInk from './DepthInk';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OutlineEffect, SelectiveBloomEffect, BlendFunction, Selection } from 'postprocessing';
// Canvas-local effects share the existing composer; no additional renderer or normal buffer.
export default function ToonHighlights({ bloom = true, paused = false }) {
  const { scene, camera } = useThree();
  const owned = useRef(new Set());
  const lights = useRef(new Map());
  const effects = useMemo(() => {
    const outline = new OutlineEffect(scene, camera, {
      blendFunction: BlendFunction.ALPHA,
      visibleEdgeColor: '#171c38',
      hiddenEdgeColor: '#171c38',
      edgeStrength: 1.7,
      blur: false,
      xRay: false,
      resolutionScale: 1,
    });
    outline.selection.layer = 10;
    // The sky/aurora use custom depth. Restrict occlusion to opaque solids,
    // otherwise their override depth incorrectly hides every contour.
    outline.depthPass.renderPass.selection = new Selection([], 13);
    const glow = bloom
      ? new SelectiveBloomEffect(scene, camera, {
          blendFunction: BlendFunction.ADD,
          intensity: 0.38,
          luminanceThreshold: 0.95,
          luminanceSmoothing: 0.35,
          mipmapBlur: true,
          radius: 0.85,
        })
      : null;
    if (glow) {
      glow.selection.layer = 12;
      glow.ignoreBackground = true;
    }
    return [outline, glow, new DepthInk()];
  }, [scene, camera, bloom]);
  useEffect(() => {
    const set = owned.current;
    set.add(effects);
    const masks = lights.current;
    return () => {
      for (const [light, wasEnabled] of masks) if (!wasEnabled) light.layers.disable(12);
      masks.clear();
      set.delete(effects);
      queueMicrotask(() => {
        if (!set.has(effects))
          for (const effect of effects) {
            effect?.depthPass?.renderPass.selection?.clear();
            effect?.dispose();
          }
      });
    };
  }, [effects]);
  useFrame(() => {
    if (paused) return;
    const contours = [],
      emitters = [],
      solids = [];
    scene.traverseVisible((object) => {
      if (object.isLight && effects[1]) {
        if (!lights.current.has(object))
          lights.current.set(object, Boolean(object.layers.mask & (1 << 12)));
        object.layers.enable(12);
      }
      if (!object.isMesh) return;
      const material = object.material;
      if (material && !material.transparent && material.depthWrite && !material.isShaderMaterial)
        solids.push(object);
      let island = false;
      for (let parent = object.parent; parent; parent = parent.parent)
        if (parent.name.startsWith('space-island-')) {
          island = true;
          break;
        }
      if (
        (material?.isMeshToonMaterial || (island && material?.isMeshStandardMaterial)) &&
        !material.transparent &&
        material.name !== 'command-eye' &&
        object.name !== 'npr-plant-lights'
      )
        contours.push(object);
      if (
        material?.name === 'command-eye' ||
        object.name === 'npr-plant-lights' ||
        object.name === 'rail-beads'
      )
        emitters.push(object);
    });
    const contourSet = new Set(contours);
    const occluders = effects[0].depthPass.renderPass.selection;
    occluders.set(solids.filter((object) => !contourSet.has(object)));
    for (const [effect, selected] of [
      [effects[0], contours],
      [effects[1], emitters],
    ]) {
      if (!effect) continue;
      const desired = new Set(selected);
      for (const object of effect.selection)
        if (!desired.has(object)) effect.selection.delete(object);
      for (const object of selected)
        if (!effect.selection.has(object)) effect.selection.add(object);
    }
  }, 0.5);
  return <>{effects.map((effect, index) => effect && <primitive key={index} object={effect} />)}</>;
}
