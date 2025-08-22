import React from 'react';
import './App.css';
import './styles/theme.css';
import { ThemeProvider } from './contexts/ThemeContext';
import BrandedHeader from './components/BrandedHeader';
import ChatInterface from './components/ChatInterface';

function App() {
  // Get client ID from environment or URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('client') || process.env.REACT_APP_CLIENT_ID || 'dubula-default';

  return (
    <ThemeProvider clientId={clientId}>
      <div className="App theme-transition">
        <BrandedHeader />
        <main className="App-main">
          <div className="theme-container">
            <ChatInterface />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;