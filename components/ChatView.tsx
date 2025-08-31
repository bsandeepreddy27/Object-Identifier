import React, { useRef, useEffect, useState } from 'react';
import { IconSpinner } from '../icons/IconSpinner';
import { IconSend } from '../icons/IconSend';

/**
 * Defines the structure of a single message in the chat.
 */
export interface Message {
  author: 'user' | 'ai';
  text: string;
}

interface ChatViewProps {
  capturedImage: string | null;
  isLoading: boolean;
  messages: Message[];
  error: string | null;
  onSendMessage: (userInput: string) => void;
  onNewPhoto: () => void;
}

/**
 * A component dedicated to displaying the chat interface, including the
 * captured image, message history, and input form for follow-up questions.
 */
export const ChatView: React.FC<ChatViewProps> = ({
  capturedImage,
  isLoading,
  messages,
  error,
  onSendMessage,
  onNewPhoto,
}) => {
  const [userInput, setUserInput] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the bottom of the chat when new messages are added.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /**
   * Handles the form submission for sending a new message.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      onSendMessage(userInput);
      setUserInput(''); // Clear the input field after sending
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
      <img
        src={capturedImage ?? ''}
        alt="Captured for analysis"
        className="rounded-lg shadow-lg w-full max-w-md max-h-48 object-contain mb-4"
      />

      <div className="w-full flex flex-col flex-grow min-h-0">
        {/* Initial loading state (before any messages) */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center flex-grow text-lg text-purple-400">
            <IconSpinner className="animate-spin w-6 h-6 mr-3" />
            Identifying...
          </div>
        )}

        {/* Initial identification error */}
        {error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-grow text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Chat and Results view */}
        {messages.length > 0 && (
          <div className="w-full flex flex-col flex-grow bg-gray-700/50 rounded-lg overflow-hidden">
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
              {/* Render each message */}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${msg.author === 'user' ? 'bg-purple-600 rounded-br-lg' : 'bg-gray-600 rounded-bl-lg'}`}>
                    <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {/* Show typing indicator when loading a response */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xs px-4 py-2 rounded-2xl bg-gray-600 rounded-bl-lg flex items-center">
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse mx-1.5" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
            </div>

            {/* Display follow-up errors */}
            {error && <p className="text-red-400 p-4 text-center border-t border-gray-600">{error}</p>}

            {/* Message input form */}
            <form onSubmit={handleSubmit} className="p-2 border-t border-gray-600 flex items-center gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-grow bg-gray-800 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                disabled={isLoading}
                aria-label="Ask a follow-up question"
              />
              <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                <IconSend className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={onNewPhoto}
          className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105"
        >
          New Photo
        </button>
      </div>
    </div>
  );
};
