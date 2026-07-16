import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { UndoProvider } from './components/UndoProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <UndoProvider>
        <App />
      </UndoProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
