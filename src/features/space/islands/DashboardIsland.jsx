import { useLearningStore } from '../../../stores/useLearningStore';
import { useEnvironmentStore } from '../../environment/useEnvironmentStore';
import { usePetActions } from '../../interaction/usePetActions';
import PetModel from '../../deskpet3d/PetModel';

export default function DashboardIsland({ tier, paused, reduced }) {
  const runtime = useLearningStore((state) => state.runtime);
  const interaction = usePetActions();
  const environment = useEnvironmentStore();

  return (
    <group position={[0, 1.4, 0]}>
      <PetModel
        runtime={runtime}
        interaction={interaction}
        environment={environment}
        reducedMotion={reduced}
        paused={paused}
        tier={tier}
        cinematic={tier >= 2}
      />
    </group>
  );
}
