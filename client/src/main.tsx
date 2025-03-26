import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Registrar service worker para PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registrado:', registration);
      })
      .catch(error => {
        console.log('Falha ao registrar SW:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
