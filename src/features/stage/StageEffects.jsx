import { useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  EffectComposer,
  EffectComposerContext,
  Bloom,
  ToneMapping,
  Vignette,
  FXAA,
  DepthOfField,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export default function StageEffects({ tier, paused, focusTarget }) {
  const ref = useRef(null);
  const depth = useRef(null);
  useFrame(() => depth.current?.target.copy(focusTarget));
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const dpr = useThree((s) => s.viewport.dpr);
  const size = useThree((s) => s.size);
  useEffect(() => {
    ref.current?.setSize(size.width, size.height);
    invalidate();
  }, [dpr, size, gl, invalidate, tier, paused]);
  return (
    <EffectComposer ref={ref} multisampling={0} enableNormalPass={false} enabled={!paused}>
      <ComposerResources />
      <Bloom
        mipmapBlur
        intensity={0.9}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.2}
        radius={0.7}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.5} />
      <FXAA />
      {/* 6.39.6 uses world distances; target keeps the requested DoF focused on the eyes. */}
      {tier === 3 && (
        <DepthOfField
          focusDistance={0.02}
          focalLength={0.055}
          bokehScale={2.2}
          resolutionScale={0.5}
          ref={depth}
          target={focusTarget}
        />
      )}
    </EffectComposer>
  );
}

// The pinned React wrapper removes replaced passes but doesn't dispose their materials
// or the composer. Preserve shared effects while releasing retired pass GPU programs.
function ComposerResources() {
  const { composer } = useContext(EffectComposerContext);
  const records = useRef(new Map());
  useLayoutEffect(() => {
    queueMicrotask(() => {
      const record = records.current.get(composer);
      if (!record) return;
      for (const pass of record.passes)
        if (!composer.passes.includes(pass)) {
          if (pass.effects) pass.effects = [];
          pass.dispose();
        }
      record.passes = [...composer.passes];
    });
  });
  useEffect(() => {
    const previous = records.current.get(composer);
    const record = { generation: (previous?.generation || 0) + 1, passes: [...composer.passes] };
    records.current.set(composer, record);
    return () =>
      queueMicrotask(() => {
        if (records.current.get(composer) !== record) return;
        for (const pass of record.passes)
          if (!composer.passes.includes(pass)) {
            if (pass.effects) pass.effects = [];
            pass.dispose();
          }
        composer.dispose();
        records.current.delete(composer);
      });
  }, [composer]);
  return null;
}
