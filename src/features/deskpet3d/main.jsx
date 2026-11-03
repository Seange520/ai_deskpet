import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import DeskPet3DStage from './DeskPet3DStage';
import './stage.css';

createRoot(document.getElementById('deskpet3d-root')).render(
  <React.StrictMode>
    <DeskPet3DStage />
  </React.StrictMode>,
);
