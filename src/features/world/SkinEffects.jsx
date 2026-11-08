import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ToneMapping, FXAA, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ScreenLightingEffect } from '../stage/AdvancedStageEffects';
import { ComposerResources } from '../stage/StageEffects';
import ToonHighlights from '../npr/ToonHighlights';
function ContactLighting() {
  const { gl, scene, camera } = useThree();
  const effect = useMemo(
    () => new ScreenLightingEffect(gl, scene, camera, false, true, 2048),
    [gl, scene, camera],
  );
  const owned = useRef(new Set());
  useEffect(() => {
    const set = owned.current;
    set.add(effect);
    return () => {
      set.delete(effect);
      queueMicrotask(() => {
        if (!set.has(effect)) effect.dispose();
      });
    };
  }, [effect]);
  return <primitive object={effect} />;
}
// Exclusive P9 premium composer; original teaching quality tiers remain independent.
export default function SkinEffects({ paused }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false} enabled={!paused}>
      <ComposerResources />
      <ContactLighting />
      <ToonHighlights bloom={false} paused={paused} />
      <Bloom
        intensity={2.8}
        luminanceThreshold={1.05}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.85}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.16} />
      <FXAA />
    </EffectComposer>
  );
}
