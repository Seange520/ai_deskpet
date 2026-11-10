import React from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@gfazioli/react-tilt/styles.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QualityProvider } from './lib/qualityTier';
import StageLayer from './features/stage/StageLayer';
import PetExplodedPage from './features/exploded/PetExplodedPage';
import './styles.css';
import './design.css';
import './product.css';
import './micro.css';
import './routes.css';
import './workshop.css';
import './runner.css';
import './visual-v2.css';
import './visual-paper.css';
import './features/exploded/exploded.css';
import { applyTheme, readTheme } from './lib/theme.mjs';

applyTheme(readTheme());

const explodedView = new URLSearchParams(window.location.search).get('exploded') === '1';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {explodedView ? (
      <PetExplodedPage />
    ) : (
      <QualityProvider>
        <StageLayer>
          <App />
        </StageLayer>
      </QualityProvider>
    )}
  </React.StrictMode>,
);

// v1.0 单机壳：生产构建下注册 Service Worker，首次访问后同一浏览器可离线进入。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
