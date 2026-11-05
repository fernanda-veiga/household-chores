import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './ui/App';
import './ui/styles.css';
import { createStorageRuntime } from './storage-runtime';

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');
const storage = createStorageRuntime();

createRoot(root).render(
  <StrictMode>
    <HashRouter><App storage={storage} /></HashRouter>
  </StrictMode>,
);
