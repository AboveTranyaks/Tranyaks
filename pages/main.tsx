import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SecurityConsoleGame from "../app/security-console-game";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Не найден корневой элемент приложения.");
}

createRoot(root).render(
  <StrictMode>
    <SecurityConsoleGame />
  </StrictMode>,
);
