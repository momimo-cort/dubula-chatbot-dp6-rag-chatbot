import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import './ChatInterface.css';

const ChatInterface = () => {
  const { getConfigValue } = useTheme();
  
  // Get configuration values
  const welcomeMessage = getConfigValue('ui.chat.welcomeMessage', 'Hello! How can I help you today?');
  const placeholder = getConfigValue('ui.chat.placeholder', 'Type your message here...');
  const showTimestamps = getConfigValue('ui.chat.showTimestamps', true);
  const showTypingIndicator = getConfigValue('ui.chat.showTypingIndicator', true);
  const allowFileUploads = getConfigValue('ui.chat.allowFileUploads', false);
  
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: welcomeMessage,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Use relative URL which will be handled by the nginx reverse proxy
      const apiUrl = '/api/chat';
      console.log('Connecting to API at:', apiUrl);
      
      const response = await axios.post(apiUrl, {
        question: inputValue
      });

      const botMessage = {
        type: 'bot',
        content: response.data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I encountered an error. Please make sure the backend server is running and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}-message`}>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              {showTimestamps && (
                <div className="message-time">{formatTime(message.timestamp)}</div>
              )}
            </div>
          </div>
        ))}
        {isLoading && showTypingIndicator && (
          <div className="message bot-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="chat-input input-themed"
            disabled={isLoading}
          />
          {allowFileUploads && (
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="file-input"
              style={{ display: 'none' }}
              id="file-upload"
            />
          )}
          {allowFileUploads && (
            <label htmlFor="file-upload" className="file-upload-button btn-outline">
              📎
            </label>
          )}
          <button 
            type="submit" 
            className="send-button btn-primary"
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;