// Global styles first, so component CSS modules can override the base primitives.
import "./styles/tokens.css";
import "./styles/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BoraApp } from "./BoraApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BoraApp />
  </StrictMode>,
);
