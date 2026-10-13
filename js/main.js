import { html } from 'htm/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
createRoot(document.getElementById('root')).render(html`<${StrictMode}><${App}/></${StrictMode}>`);
