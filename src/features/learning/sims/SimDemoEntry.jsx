import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SimDemoPanel from './SimDemoPanel.jsx';
export default function SimDemoEntry() {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null),
    dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => {
      previous?.focus();
    };
  }, [open]);
  return createPortal(
    <>
      <button
        className="sims-entry"
        data-testid="sims-entry"
        ref={trigger}
        onClick={() => setOpen(true)}
      >
        动手校验 · DEV
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="sims-dialog"
          aria-label="动手校验仿真库"
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
        >
          <button className="sims-close" onClick={() => setOpen(false)}>
            关闭仿真
          </button>
          <SimDemoPanel />
        </dialog>
      )}
    </>,
    document.body,
  );
}
