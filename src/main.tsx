import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './index.css';
import App from './App';

// Sin StrictMode: el doble montaje en desarrollo registraría eventos de analítica duplicados
// (inicio/abandono de solicitud).
createRoot(document.getElementById('root')!).render(<App />);
