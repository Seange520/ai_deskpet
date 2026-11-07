import { EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ComposerResources } from '../stage/StageEffects';
import ToonHighlights from './ToonHighlights';
export default function PetToonEffects({ tier, paused }) {
  if (tier < 2) return null;
  return (
    <EffectComposer enabled={!paused} multisampling={0} enableNormalPass={false}>
      <ComposerResources />
      <ToonHighlights paused={paused} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
