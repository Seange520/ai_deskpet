import { lazy } from 'react';
export const LazyProfilePanel = lazy(() => import('./ProfilePanel.jsx'));
export default function IdentityEntry({ onClick, disabled }) {
  const world = new URLSearchParams(location.search).get('world') === 'p9';
  return (
    <button
      type="button"
      className="icon-btn"
      style={
        world
          ? {
              position: 'fixed',
              left: 132,
              top: 60,
              zIndex: 30,
              visibility: 'visible',
              width: 'auto',
              minHeight: 40,
              paddingInline: 10,
            }
          : { width: 'auto', minHeight: 40, paddingInline: 10 }
      }
      disabled={disabled}
      data-testid="identity-entry"
      aria-label="维护者档案"
      onClick={onClick}
    >
      维护者档案
    </button>
  );
}
