import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import DeskPet3DDemo from './DeskPet3DDemo';
import './stage.css';

createRoot(document.getElementById('deskpet3d-root')).render(
  <React.StrictMode>
    <DeskPet3DDemo />
  </React.StrictMode>,
);
