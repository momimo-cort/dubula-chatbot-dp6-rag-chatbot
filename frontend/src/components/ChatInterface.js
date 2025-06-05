import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: 'Hello! I\'m Dubula, your restaurant training assistant. Ask me anything about customer service, food handling, table setup, or any other restaurant operations.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-start voice listening on component mount
  useEffect(() => {
    startVoiceListening();
    return () => {
      stopVoiceListening();
    };
  }, []);

  const startVoiceListening = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          console.log('Audio blob size:', audioBlob.size);
          if (audioBlob.size > 1000) { // Only process if there's substantial audio
            await processVoiceInput(audioBlob);
          }
        }
        audioChunksRef.current = [];
        
        // Restart recording after processing
        if (mediaRecorderRef.current && !isSpeaking) {
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
              mediaRecorderRef.current.start();
            }
          }, 500);
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsListening(true);
      console.log('Started voice listening');
      
      // Stop and restart recording every 5 seconds to check for speech
      const recordingInterval = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && !isSpeaking) {
          mediaRecorderRef.current.stop();
        }
      }, 5000);

      // Store interval reference for cleanup
      mediaRecorderRef.current.recordingInterval = recordingInterval;
      
    } catch (error) {
      console.error('Error starting voice listening:', error);
      setIsListening(false);
    }
  };

  const stopVoiceListening = () => {
    console.log('Stopping voice listening...');
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.recordingInterval) {
        clearInterval(mediaRecorderRef.current.recordingInterval);
      }
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsListening(false);
  };

  const processVoiceInput = async (audioBlob) => {
    try {
      console.log('Processing voice input...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_input.wav');

      const response = await axios.post('/api/stt/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('STT response:', response.data);
      const transcription = response.data.transcription;
      if (transcription && transcription.trim().length > 3) { // Require at least 3 chars
        console.log('Transcription:', transcription);
        await handleVoiceMessage(transcription);
      } else {
        console.log('No meaningful transcription:', transcription);
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
    }
  };

  const handleVoiceMessage = async (text) => {
    const userMessage = {
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        question: text
      });

      const botMessage = {
        type: 'bot',
        content: response.data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Automatically speak the response
      await speakResponse(response.data.answer);
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakResponse = async (text) => {
    try {
      setIsSpeaking(true);
      const response = await axios.post('/api/tts/synthesize', {
        text: text,
        voice: 'neutral',
        format: 'wav'
      }, {
        responseType: 'blob'
      });

      const audioBlob = new Blob([response.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error speaking response:', error);
      setIsSpeaking(false);
    }
  };

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
      
      // Automatically speak the response
      await speakResponse(response.data.answer);
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
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        {isLoading && (
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
      
      <div className="voice-status">
        <div className={`status-indicator ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
          {isListening && !isSpeaking && '🎤 Listening...'}
          {isSpeaking && '🔊 Speaking...'}
          {!isListening && !isSpeaking && '💤 Idle'}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about restaurant service, food handling, complaints... (or just speak!)"
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!inputValue.trim() || isLoading}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;