import React from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@gfazioli/react-tilt/styles.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QualityProvider } from './lib/qualityTier';
import StageLayer from './features/stage/StageLayer';
import './styles.css';
import './design.css';
import './product.css';
import './micro.css';
import './routes.css';
import './workshop.css';
import './runner.css';
import './visual-v2.css';
import './visual-paper.css';
import { applyTheme, readTheme } from './lib/theme.mjs';

applyTheme(readTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QualityProvider>
      <StageLayer>
        <App />
      </StageLayer>
    </QualityProvider>
  </React.StrictMode>,
);
