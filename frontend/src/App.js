import React, { useState } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Restaurant Training Chatbot</h1>
        <p>Ask questions about restaurant service, food handling, and customer service</p>
      </header>
      <main>
        <ChatInterface />
      </main>
    </div>
  );
}

export default App;