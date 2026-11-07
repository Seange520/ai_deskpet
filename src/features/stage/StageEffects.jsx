import { useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  EffectComposer,
  EffectComposerContext,
  ToneMapping,
  Vignette,
  FXAA,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import ToonHighlights from '../npr/ToonHighlights';

// P8-M0: one existing composer. Omit SSR/GTAO/DoF so they cannot soften the Toon bands.
export default function StageEffects({ tier, paused, cinematic }) {
  const ref = useRef(null);
  const { gl, invalidate, size, viewport } = useThree();
  useEffect(() => {
    ref.current?.setSize(size.width, size.height);
    invalidate();
  }, [viewport.dpr, size, gl, invalidate, tier, paused]);
  if (gl.getContext().isContextLost()) return null;
  return (
    <EffectComposer
      key={[tier, cinematic].join(':')}
      ref={ref}
      multisampling={0}
      enableNormalPass={false}
      enabled={!paused}
    >
      <ComposerResources />
      <ToonHighlights bloom={cinematic} paused={paused} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.18} />
      <FXAA />
    </EffectComposer>
  );
}

// The pinned React wrapper removes replaced passes but doesn't dispose their materials
// or the composer. Preserve shared effects while releasing retired pass GPU programs.
export function ComposerResources() {
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
