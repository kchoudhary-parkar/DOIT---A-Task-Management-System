import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from "@react-oauth/google";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const MICROSOFT_CLIENT_ID = process.env.REACT_APP_MICROSOFT_CLIENT_ID || "YOUR_MICROSOFT_CLIENT_ID";

const msalConfig = {
  auth: {
    clientId: MICROSOFT_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: process.env.REACT_APP_MSAL_REDIRECT_URI || window.location.origin
  }
};
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize the MSAL instance before rendering
msalInstance.initialize().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  const isDevelopment = process.env.NODE_ENV === 'development';

  const app = (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MsalProvider>
    </GoogleOAuthProvider>
  );

  root.render(
    isDevelopment ? <React.StrictMode>{app}</React.StrictMode> : app
  );
}).catch(e => {
  console.error("MSAL Initialization Failed", e);
});