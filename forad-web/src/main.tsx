import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import { RouterProvider } from './lib/router';
import { DecisionProvider } from './lib/decisionStore';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DecisionProvider>
        <RouterProvider>
          <App />
        </RouterProvider>
      </DecisionProvider>
    </AuthProvider>
  </StrictMode>,
);
