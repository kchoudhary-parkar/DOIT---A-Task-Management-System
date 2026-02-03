import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ClerkProvider } from '@clerk/clerk-react';

// Get Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key. Social auth will not work.');
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// ⚡ Disable StrictMode in production to prevent double rendering and duplicate API calls
// StrictMode intentionally double-renders components in development to detect side effects
const isDevelopment = process.env.NODE_ENV === 'development';

const app = (
  <ClerkProvider 
    publishableKey={CLERK_PUBLISHABLE_KEY}
    appearance={{
      variables: { 
        colorPrimary: '#6366f1',
        colorBackground: '#1a1a2e',
        colorText: '#ffffff'
      }
    }}
  >
    <AuthProvider>
      <App />
    </AuthProvider>
  </ClerkProvider>
);

root.render(
  isDevelopment ? <React.StrictMode>{app}</React.StrictMode> : app
);