import React, { useState, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { ChatView, type Message } from './components/ChatView';
import { getInitialObjectDescription, getFollowUpAnswer, ConfigError } from './services/aiService';
import { dataUrlToBase64 } from './utils/imageUtils';
import { IconCamera } from './icons/IconCamera';
import { ConfigErrorView } from './components/ConfigErrorView';

/**
 * The main application component. It orchestrates the entire user experience,
 * switching between the camera view and the results/chat view.
 */
const App: React.FC = () => {
  // State to manage which view is currently active
  const [currentView, setCurrentView] = useState<'home' | 'camera' | 'results'>('home');
  
  // State for the captured image (as a data URL)
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // State to track if the AI is currently processing a request
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State to hold the history of the conversation with the AI
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State for storing any API errors that occur during calls
  const [error, setError] = useState<string | null>(null);

  // State for storing critical configuration errors (e.g., missing API key)
  const [configError, setConfigError] = useState<string | null>(null);

  /**
   * Resets the application to its initial state.
   */
  const resetState = () => {
    setCapturedImage(null);
    setIsLoading(false);
    setMessages([]);
    setError(null);
    // Do not reset configError, as it's a persistent issue until fixed.
    setCurrentView('home');
  };

  /**
   * This function is called when the user captures a photo in the CameraView.
   * It triggers the initial object identification process.
   * @param imageDataUrl The data URL of the captured image.
   */
  const handleCapture = async (imageDataUrl: string) => {
    // Switch to the results view and set the captured image
    setCurrentView('results');
    setCapturedImage(imageDataUrl);
    // Reset previous messages and errors
    setMessages([]);
    setError(null);
    // Set loading state to true
    setIsLoading(true);

    try {
      // Convert the image to Base64
      const base64Image = dataUrlToBase64(imageDataUrl);
      // Call the AI service to get the initial description
      const description = await getInitialObjectDescription(base64Image);
      // Add the AI's response to the message list
      setMessages([{ author: 'ai', text: description }]);
    } catch (err: any) {
      console.error(err);
      if (err instanceof ConfigError) {
        setConfigError(err.message);
      } else {
        setError(err.message || 'Could not identify the object. Please try again.');
      }
    } finally {
      // Set loading state to false
      setIsLoading(false);
    }
  };

  /**
   * This function is called when the user sends a follow-up message in the ChatView.
   * @param userInput The text message from the user.
   */
  const handleSendMessage = useCallback(async (userInput: string) => {
    // Ensure there's an image and the input is not empty
    if (!capturedImage || !userInput.trim() || isLoading) return;

    // Add the user's message to the chat history
    const newUserMessage: Message = { author: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    
    setIsLoading(true);
    setError(null);

    try {
      const base64Image = dataUrlToBase64(capturedImage);
      // Pass the full message history to the AI for context
      const aiResponse = await getFollowUpAnswer(base64Image, messages, userInput);
      // Add the AI's new response to the chat
      setMessages(prev => [...prev, { author: 'ai', text: aiResponse }]);
    } catch (err: any) {
      console.error(err);
      if (err instanceof ConfigError) {
        setConfigError(err.message);
      } else {
        setError(err.message || 'There was an error getting a response. Please try again.');
        // If the API call fails, remove the user's message to avoid confusion
        setMessages(prev => prev.filter(msg => msg !== newUserMessage));
      }
    } finally {
      setIsLoading(false);
    }
  }, [capturedImage, messages, isLoading]);

  const handleConfigError = useCallback((message: string) => {
    setConfigError(message);
  }, []);

  /**
   * Renders the main content of the page based on the current view state.
   */
  const renderContent = () => {
    switch (currentView) {
      case 'camera':
        return <CameraView onCapture={handleCapture} onClose={() => setCurrentView('home')} onConfigError={handleConfigError} />;
      
      case 'results':
        return (
          <ChatView
            capturedImage={capturedImage}
            isLoading={isLoading}
            messages={messages}
            error={error}
            onSendMessage={handleSendMessage}
            onNewPhoto={() => {
              resetState();
              setCurrentView('camera');
            }}
          />
        );
        
      case 'home':
      default:
        return (
          <div className="text-center">
            <IconCamera className="w-20 h-20 mx-auto text-gray-500 mb-4" />
            <button
              onClick={() => setCurrentView('camera')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Start Camera
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      {configError && <ConfigErrorView message={configError} />}
      <div className={`w-full max-w-2xl mx-auto text-center flex flex-col h-full ${configError ? 'blur-sm' : ''}`}>
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            AI Object Identifier
          </h1>
          <p className="text-gray-400 mt-2">Instant object recognition and visual Q&A, on the go.</p>
        </header>

        <main className="bg-gray-800 rounded-xl shadow-2xl p-6 flex-grow flex flex-col justify-center items-center relative overflow-hidden min-h-[60vh]">
          {renderContent()}
        </main>

        <footer className="mt-8 text-gray-500 text-sm">
          <p>Powered by AI</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
