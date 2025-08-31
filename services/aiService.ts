import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { type Message } from "../components/ChatView";

// --- Initialization ---
// The GoogleGenAI instance is initialized lazily.
let ai: GoogleGenAI | null = null;

/**
 * Retrieves the Gemini API key from the environment.
 * It checks for Vite's `VITE_API_KEY` for local development, Vercel, and Netlify first,
 * then falls back to `process.env.API_KEY` for AI Studio.
 * @throws {ConfigError} If the API key is not configured in any environment.
 */
function getApiKey(): string {
  let apiKey: string | undefined;

  // Check for Vite-style environment variables, used for local dev, Vercel, and Netlify.
  // @ts-ignore - This is a Vite-specific feature and may not be known by TypeScript.
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
    // @ts-ignore
    apiKey = import.meta.env.VITE_API_KEY;
  }

  // Fallback to process.env for Node.js environments and platforms like AI Studio.
  if (!apiKey && typeof process !== 'undefined' && process.env?.API_KEY) {
    apiKey = process.env.API_KEY;
  }
  
  // Check if the key is found and is not a placeholder value.
  if (apiKey && apiKey.trim() && !apiKey.includes('YOUR_API_KEY')) {
    return apiKey;
  }

  // If no valid key is found, throw a helpful error with setup instructions.
  throw new ConfigError(
    "API key not configured. Please follow these instructions:\n\n" +
    "► For Local Development:\n" +
    "  1. Create a file named `.env` in the project root.\n" +
    "  2. Add this line: VITE_API_KEY=YOUR_API_KEY\n" +
    "  3. Replace YOUR_API_KEY with your actual Google AI key.\n\n" +
    "► For Vercel or Netlify:\n" +
    "  1. Go to your project's settings.\n" +
    "  2. Find the 'Environment Variables' section.\n" +
    "  3. Create a new variable named `VITE_API_KEY` and set its value to your key.\n\n" +
    "► For AI Studio:\n" +
    "  1. Click the 'Secrets' icon (a key) on the left sidebar.\n" +
    "  2. Create a new secret named `API_KEY` and set its value to your key."
  );
}


const getAi = () => {
    if (!ai) {
        const apiKey = getApiKey();
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

const model = 'gemini-2.5-flash';


// --- Custom Errors ---
/**
 * Custom error class for critical configuration issues (e.g., missing API key).
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Custom error class for API rate limit errors.
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}


// --- Helper Functions ---

/**
 * A generic function to call the AI model with an image and a text prompt.
 * This serves as a base for all other functions in this service.
 * @param base64Image The base64 encoded image data.
 * @param prompt The text prompt to send to the model.
 * @returns The text response from the AI.
 */
async function generateVisionContent(base64Image: string, prompt: string): Promise<string> {
  try {
    const aiInstance = getAi(); // This may throw an error if the API key is invalid.

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    };

    const textPart = { text: prompt };

    const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model,
        contents: { parts: [imagePart, textPart] },
    });
    
    const text = response.text;
    
    if (!text) {
        console.error("The AI returned an empty response.", JSON.stringify(response, null, 2));
        throw new Error("The AI returned an empty response.");
    }
    return text.trim();
  } catch (error: any) {
    console.error("Error calling AI API:", error);

    // Propagate config errors directly
    if (error instanceof ConfigError) {
        throw error;
    }
    
    const rawMessage = error?.message || error?.toString() || '';

    // Check for specific invalid key messages from the API
    if (rawMessage.includes('API key not valid') || rawMessage.includes('permission to access') || rawMessage.includes('400')) {
        // FIX: Update error message to be more user-friendly and not expose implementation details.
        throw new ConfigError("This application is not configured correctly due to an invalid API key or permissions issue.");
    }

    // Check for rate limit / quota errors
    if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429') || rawMessage.includes('exceeded your current quota')) {
      throw new RateLimitError("Request limit reached. This could be due to too many requests per minute or exceeding the daily quota. Please wait and try again later.");
    }
    
    throw new Error("Failed to communicate with the AI model. Please check your network connection.");
  }
}


// --- Public API Functions ---

/**
 * Gets a detailed, one-paragraph description of the main object in an image.
 * Used for the initial identification after a user takes a picture.
 * @param base64Image The base64 encoded image data.
 * @returns A descriptive paragraph about the object.
 */
export async function getInitialObjectDescription(base64Image: string): Promise<string> {
  const prompt = `Identify the main object in this image. 
    Provide a concise, one-paragraph description covering what it is, its typical uses, and one interesting fact about its origin. 
    If the object is ambiguous, describe the most likely possibility.`;
  return generateVisionContent(base64Image, prompt);
}

/**
 * Gets an answer to a follow-up question based on the image and previous conversation.
 * @param base64Image The base64 encoded image data.
 * @param messages The history of the conversation so far.
 * @param newUserInput The new question from the user.
 * @returns A contextual answer from the AI.
 */
export async function getFollowUpAnswer(base64Image: string, messages: Message[], newUserInput: string): Promise<string> {
  // Build a conversational prompt with history to provide context for the follow-up question.
  const history = messages
    .map(msg => `${msg.author === 'user' ? 'User' : 'AI'}: ${msg.text}`)
    .join('\n');

  const prompt = `You are an AI assistant analyzing an image.
Based on the image and the conversation history below, provide a concise answer to the user's latest question.

Conversation History:
${history}

Latest Question from User:
${newUserInput}`;

  return generateVisionContent(base64Image, prompt);
}

/**
 * Gets a very short, one or two-word name for the most prominent object in an image.
 * Used for the real-time and tap-to-identify features.
 * @param base64Image The base64 encoded image data.
 * @returns The name of the object.
 */
export async function getQuickObjectName(base64Image: string): Promise<string> {
  const prompt = `What is the single, most prominent object in this image? 
    Respond with only the name of the object. Keep it to one or two words.`;
  const response = await generateVisionContent(base64Image, prompt);
  // Clean up the response to be just the object name
  return response.replace(/(\r\n|\n|\r)/gm, " ").split(".")[0];
}