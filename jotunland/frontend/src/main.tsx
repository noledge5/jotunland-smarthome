import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Schriften liegen im Add-on – keine Anfrage an Google
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/hanken-grotesk/latin-400.css";
import "@fontsource/hanken-grotesk/latin-600.css";
import "@fontsource/sarina/latin-400.css";
import "./styles.css";
import { applyTheme } from "./theme";

applyTheme();

// Fehlgeschlagene Befehle zeigt die Oberfläche selbst an (Meldung unten rechts)
window.addEventListener("unhandledrejection", (ev) => {
  if ((ev.reason as { gemeldet?: boolean } | undefined)?.gemeldet) ev.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
