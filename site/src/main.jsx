import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled with the site (only the Latin letters and weights used), so
// visitors' browsers never contact a font server
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-700.css";
import "./styles.css";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n/language.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
