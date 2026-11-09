import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import AiPanel from './AiPanel.jsx';
import { useStreet } from '../street/streetStore.js';
import { useLearningProfile } from '../learning/learningProfileStore.js';
import { buildCorpus } from './rag.mjs';
import graph from '../learning/data/knowledge-graph.v1.json';
import { diagnosticEvent } from './ai.mjs';
import { useAi } from './aiStore.js';
import './ai.css';
const lessons = Object.values(
  import.meta.glob('../learning/data/lessons/*.json', { eager: true, import: 'default' }),
);
const corpus = buildCorpus(graph, lessons);
export default function AiEntry({ disabled }) {
  const [open, setOpen] = useState(false),
    trigger = useRef(null),
    diagnosis = useRef({});
  const learning = useLearningProfile((s) => s.profile);
  // Existing profiles have no chapter reveal field: fail closed at public level 0.
  const profile = { ...learning, maxSeenSpoiler: learning.maxSeenSpoiler ?? 0 };
  useEffect(() => {
    const observe = (event) => {
      const result = diagnosticEvent(diagnosis.current, event);
      diagnosis.current = result.state;
      const store = useAi.getState(),
        memory = store.memory;
      if (result.key && !memory.aideDiagnosis.some((d) => d.key === result.key))
        store.update({
          ...memory,
          aideDiagnosis: [...memory.aideDiagnosis, { at: Date.now(), key: result.key }],
        });
    };
    const unsubscribe = useStreet.subscribe((s, previous) => {
      if (s.reading && s.reading !== previous.reading)
        observe({ type: 'measurement', key: s.reading.node + ':' + s.mode });
    });
    const click = (e) => {
      if (/^确认(接地不良|启动过载)$/.test(e.target.closest?.('button')?.textContent?.trim() || ''))
        queueMicrotask(() => {
          if (useStreet.getState().message.startsWith('证据不足'))
            observe({ type: 'wrongDiagnosis' });
        });
    };
    document.addEventListener('click', click, true);
    return () => {
      unsubscribe();
      document.removeEventListener('click', click, true);
    };
  }, []);
  return createPortal(
    <div className="ai-root">
      <button
        ref={trigger}
        className="ai-entry"
        data-testid="ai-entry"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle size={17} />零 · 档案
      </button>
      {open && (
        <AiPanel
          corpus={corpus}
          profile={profile}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </div>,
    document.body,
  );
}
