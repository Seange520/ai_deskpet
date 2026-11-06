import { DepthOfField } from '@react-three/postprocessing';
import AdvancedEffects from './AdvancedStageEffects';
import StageEffects from './StageEffects';

export default function CinematicStageEffects(props) {
  return <StageEffects {...props} AdvancedEffects={AdvancedEffects} DepthOfField={DepthOfField} />;
}
