import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { useLearningStore } from '../stores/useLearningStore';
import Button from './Button';
import { useEnvironment } from '../features/environment/useEnvironment';
import { Maximize2 } from 'lucide-react';
import PetFocusView from '../features/deskpet3d/PetFocusView';
import RenderBoundary from '../features/stage/RenderBoundary';
import { playSound } from '../lib/sounds';
import Companion2D from './Companion2D';
import './companion3d.css';
import { useQualityTier } from '../lib/qualityTier';
import { usePetActions } from '../features/interaction/usePetActions';
import {
  usePetForm,
  useLorePresentation,
  usePresentationBlocked,
} from '../features/space/useLorePresentation';

const DeskPet3DStage = lazy(() => import('../features/deskpet3d/DeskPet3DStage'));

export default function Companion({ celebrations, feedback, hidden }) {
  const environmentSound = useCallback(
    (night) =>
      playSound(night ? 'night' : 'day', useLearningStore.getState().muted, { ambient: true }),
    [],
  );
  const environment = useEnvironment(environmentSound);
  const runtime = useLearningStore((state) => state.runtime);
  const form = usePetForm();
  const lore = useLorePresentation((s) => s.message);
  const blocked = usePresentationBlocked();
  const evolving = useLorePresentation((s) => s.evolving) && !blocked;
  const interaction = usePetActions();

  const quality = useQualityTier();
  const stage = useRef(null);
  const [focused, setFocused] = useState(false);
  const [curious, setCurious] = useState(false);
  const [small, setSmall] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    if (hidden || unsupported) setFocused(false);
  }, [hidden, unsupported]);
  const [suspended, setSuspended] = useState(document.hidden);
  const fail = useCallback(() => setUnsupported(true), []);
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    const sync = () => setSuspended(document.hidden || (Boolean(shell?.inert) && !focused));
    const observer = new MutationObserver(sync);
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['inert'] });
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [focused]);
  useEffect(() => {
    if (celebrations > 0 && !reduced)
      controls.start({
        y: [0, -26, 0, -10, 0],
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      });
  }, [celebrations, controls, reduced]);
  const fallback = <Companion2D celebrations={celebrations} feedback={feedback} hidden={hidden} />;
  if (unsupported || quality.tier === 0) return fallback;
  return (
    <Suspense fallback={fallback}>
      <div
        className={`companion companion-3d ${small ? 'is-small' : ''} emotion-${feedback.type} ${evolving ? 'is-evolving' : ''}`}
        hidden={hidden}
      >
        {!small && (
          <span className="companion-bubble" aria-live="polite">
            {lore
              ? lore.text
              : feedback.id > 0
                ? feedback.message
                : curious
                  ? '在看什么？带上我呀。'
                  : feedback.message}
          </span>
        )}
        <Button
          className="pet-focus-trigger"
          data-testid="deskpet-focus-button"
          aria-label="聚焦 3D 桌宠"
          aria-haspopup="dialog"
          aria-expanded={focused}
          onClick={() => {
            controls.stop();
            controls.set({ y: 0 });
            setFocused(true);
          }}
        >
          <Maximize2 size={14} />
          聚焦
        </Button>
        <motion.div
          animate={controls}
          onHoverStart={() => setCurious(true)}
          onHoverEnd={() => setCurious(false)}
        >
          <Button
            className="companion3d-button"
            aria-label={small ? '展开桌宠伙伴' : '收起桌宠伙伴'}
            onFocus={() => setCurious(true)}
            onBlur={() => setCurious(false)}
            onClick={() => {
              if (!focused) setSmall(!small);
            }}
          >
            <PetFocusView
              evolving={evolving}
              focused={focused && !unsupported && !hidden}
              onClose={() => setFocused(false)}
              onReset={() => stage.current?.resetView()}
              onPet={() => stage.current?.petHead()}
            >
              <RenderBoundary onFail={fail}>
                <DeskPet3DStage
                  ref={stage}
                  tier={quality.tier}
                  form={form}
                  evolving={evolving}
                  runtime={runtime}
                  interaction={interaction}
                  environment={environment}
                  compact={!focused}
                  still={small && !focused}
                  onPet={(kind) => playSound(kind, useLearningStore.getState().muted)}
                  paused={hidden || suspended}
                  onUnsupported={fail}
                />
              </RenderBoundary>
            </PetFocusView>
          </Button>
        </motion.div>
      </div>
    </Suspense>
  );
}
