// src/components/ChatBox.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import '../styles/chatbox.css';

const ChatBox = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I’m the virtual assistant of ĐATSAN247. How can I help you?'
    },
    {
      id: 2,
      sender: 'ai',
      text: 'Do you want to find a badminton court, look up information, or book a court today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    console.log("Input value:", value); 
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessageObj = {
      id: messages.length + 1,
      sender: 'user',
      text: message
    };
    
    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);
    setMessage('');
    
    try {
      // Gọi API để lấy phản hồi từ AI
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      const data = JSON.parse(responseText);
      
      // Add AI response to chat
      const aiMessageObj = {
        id: messages.length + 2,
        sender: 'ai',
        text: data.answer,
        method: data.method,
        score: data.score
      };
      
      setMessages(prev => [...prev, aiMessageObj]);
    } catch (error) {
      console.error('Error:', error);
      // Add error message
      const errorMessageObj = {
        id: messages.length + 2,
        sender: 'ai',
        text: 'Sorry, something went wrong. Please try again later.',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <div className="ai-avatar">AI</div>
          <span>Giải Đáp thắc mắc DATSAN247</span>
        </div>
        <button onClick={onClose} className="close-chat-btn">
          <X size={18} />
        </button>
      </div>
      <div className="ai-chat-messages">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}
          >
            {msg.sender === 'ai' && <div className="ai-avatar">AI</div>}
            <div className={`message-content ${msg.sender === 'user' ? 'user-content' : ''} ${msg.error ? 'error-message' : ''}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-message">
            <div className="ai-avatar">AI</div>
            <div className="message-content typing">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="ai-chat-input">
        <input 
          type="text" 
          placeholder="Nhập tin nhắn của bạn..." 
          value={message}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          disabled={isLoading}
        />
        <button 
          className="send-message-btn" 
          onClick={handleSendMessage}
          disabled={isLoading || !message.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;