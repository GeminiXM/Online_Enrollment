import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import reportWebVitals from "./reportWebVitals.js";
import "./index.css";
import { APP_VERSION } from "./version";
// Initialize global error logger
import "./utils/errorLogger.js";
// Initialize console logger (captures console.log, console.error, etc. in production)
import "./utils/consoleLogger.js";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Disable browser scroll restoration so SPA controls scroll position
try {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
} catch (_) {}
root.render(
  <React.StrictMode>
    <BrowserRouter basename="/online-enrollment">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
try {
  console.log(`[Build] Online Enrollment version ${APP_VERSION}`);
} catch (_) {}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
