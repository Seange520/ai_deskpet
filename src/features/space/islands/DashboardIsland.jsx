import { useLearningStore } from '../../../stores/useLearningStore';
import { useEnvironmentStore } from '../../environment/useEnvironmentStore';
import { usePetActions } from '../../interaction/usePetActions';
import PetModel from '../../deskpet3d/PetModel';
import { usePetForm } from '../useLorePresentation';

export default function DashboardIsland({ tier, paused, reduced, travelRoot }) {
  const runtime = useLearningStore((state) => state.runtime);
  const form = usePetForm();
  const interaction = usePetActions();
  const environment = useEnvironmentStore();

  return (
    <PetModel
      key={form}
      form={form}
      runtime={runtime}
      interaction={interaction}
      environment={environment}
      reducedMotion={reduced}
      paused={paused}
      tier={tier}
      cinematic={tier >= 2}
      platform={false}
      travelRoot={travelRoot}
    />
  );
}
