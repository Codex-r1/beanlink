import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from 'virtual:pwa-register'
import { GoogleOAuthProvider } from '@react-oauth/google';
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
     <GoogleOAuthProvider clientId="1097989936197-4af9lku6a06gnm1e2rpt3s9on6f7chf2.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
registerSW({ immediate: true })