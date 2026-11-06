import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/i18n";
import "@/index.css";
import { initSentry, sentryReactRootOptions } from "@/observability/sentry";

initSentry();

createRoot(document.getElementById("root")!, sentryReactRootOptions).render(
  <StrictMode>
    <App />
  </StrictMode>
);
