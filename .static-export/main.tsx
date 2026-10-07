import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import Game from "../src/game/Game";
createRoot(document.getElementById("root")!).render(<StrictMode><Game /></StrictMode>);
