
# 🤖 AI Object Identifier

An intelligent Progressive Web App (PWA) that uses your device's camera and the Google Gemini API to identify objects in real-time, provide detailed descriptions, and answer follow-up questions in a conversational format.

<!-- Placeholder for a Live Demo link -->
<!-- **[🚀 View Live Demo](https://your-deployment-link.com)** -->

---

## 🌟 High-Level Overview

This application transforms your phone or laptop into a powerful visual search tool. Point your camera at an object, and the app will tell you what it is. Snap a picture to get a rich, detailed description, and then dive deeper by asking questions like "What is this made of?" or "Where does this come from?".

It's built from the ground up as a modern, installable web app, meaning you get a native-app-like experience directly from your browser, complete with offline access and a home screen icon.

## ✨ Key Features

- **📸 Real-time Object Recognition**: The camera view continuously scans and displays quick labels for objects it sees, offering immediate insight.
- **👆 Tap-to-Identify**: See something specific? Tap directly on the video feed to get a focused identification of that precise area.
- **🖼️ High-Quality Capture & Analysis**: Take a high-resolution photo to get a detailed, one-paragraph summary of the main object, including its uses and interesting facts.
- **💬 Conversational Q&A**: After the initial analysis, a chat interface appears, allowing you to ask follow-up questions in a natural, conversational way. The AI remembers the context of the image.
- **💡 Advanced Camera Controls**:
  - **Flash Toggle**: Illuminate your subject in low-light conditions.
  - **Camera Switching**: Effortlessly switch between front-facing and rear-facing cameras.
  - **Digital Zoom**: Get a closer look with a smooth zoom slider.
- **📱 Progressive Web App (PWA) Ready**:
  - **Installable**: Add the app to your device's home screen for quick access.
  - **Offline Capable**: The core application shell loads instantly, even without an internet connection, thanks to a service worker.
- **🎨 Modern & Responsive UI**: Built with Tailwind CSS, the interface is sleek, intuitive, and adapts beautifully to any screen size, from mobile phones to desktops.
- **✅ Robust Error Handling**: Provides clear, user-friendly guidance for common issues like missing API keys or denied camera permissions.

## 🛠️ Technology Stack

This project uses a modern, no-build-step setup, relying on browser-native ES Modules and CDN-hosted packages.

- **Core Framework**: **React 19**
- **Language**: **TypeScript**
- **AI Model**: **Google Gemini API** (`@google/genai`)
- **Styling**: **Tailwind CSS** (via CDN)
- **Core Browser APIs**:
  - **MediaDevices API (`getUserMedia`)**: For camera access and control.
  - **Service Worker API**: For PWA features and offline caching.

---

## 🚀 Getting Started: Local Development

Follow these steps to get the project running on your local machine.

### Prerequisites

- **[Git](https://git-scm.com/)**: For cloning the repository.
- **[Node.js](https://nodejs.org/)**: (v18 or newer) Although there's no build step, you'll need Node.js to run a local server.
- **A Modern Web Browser**: Chrome, Firefox, Edge, or Safari.

### Step 1: Clone the Repository

Open your terminal, navigate to where you want to store the project, and run the following commands:

```bash
git clone https://github.com/google/generative-ai-docs.git
cd generative-ai-docs/demos/object_identifier_js
```

### Step 2: Configure Your API Key

The application requires a Google AI API key to function.

1.  **Get Your API Key**: Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**. Create a new API key if you don't have one, and copy it to your clipboard.

2.  **Create an Environment File**: In the project's root directory (`object_identifier_js`), find the file named `env-example.txt` and **rename it to `.env`**.

3.  **Add Your Key to the `.env` File**: Open the new `.env` file in a text editor and paste your API key:

    ```
    # Replace YOUR_API_KEY_HERE with the key you copied from Google AI Studio
    VITE_API_KEY="YOUR_API_KEY_HERE"
    ```

    > **Security Note**: The `.gitignore` file is already configured to ignore `.env` files, so your API key will not be accidentally committed to source control.

### Step 3: Run the Local Server

This project is designed to run without a complex build process. All you need is a simple local web server. The recommended tool is `serve`.

1.  **Install `serve`**: If you don't have it, install it globally using npm:
    ```bash
    npm install -g serve
    ```

2.  **Start the Server**: From the project's root directory, run:
    ```bash
    serve
    ```

### Step 4: Open the Application

The `serve` command will output a local address, typically `http://localhost:3000`.

-   Open this URL in your web browser.
-   The browser will likely ask for permission to access your camera. **You must grant permission** for the app to work.

You are now running the AI Object Identifier locally!

---

## ☁️ Deployment

You can deploy this static application to any modern hosting provider. Below are detailed instructions for Vercel and Netlify.

**🔑 Crucial Prerequisite**: For any hosting provider, you **must** configure an environment variable named `VITE_API_KEY` in your project's settings on that platform, using the same API key from your `.env` file.

### Deploying to Vercel

1.  **Push to GitHub**: Make sure your project is on a GitHub (or GitLab/Bitbucket) repository.
2.  **Import to Vercel**:
    - Log in to your Vercel account and click "Add New... > Project".
    - Select your Git repository.
3.  **Configure Project**: Vercel is smart but let's ensure the settings are correct.
    - **Framework Preset**: Select `Other`.
    - **Build and Output Settings**: No build command is needed. Leave the build command blank and the output directory as the default. The `vercel.json` file in the repository will handle the necessary routing for this single-page app.
4.  **Add Environment Variable**:
    - Navigate to your project's **Settings > Environment Variables**.
    - Add a new variable:
      - **Name**: `VITE_API_KEY`
      - **Value**: Paste your Google AI API key.
5.  **Deploy**: Click the "Deploy" button. Vercel will build and host your site.

### Deploying to Netlify

1.  **Push to GitHub**: Ensure your project is available on a Git repository.
2.  **Import to Netlify**:
    - Log in to Netlify and select "Add new site > Import an existing project".
    - Connect to your Git provider and choose the repository.
3.  **Configure Site Settings**:
    - **Build command**: Leave this blank.
    - **Publish directory**: Set this to `.` (the root of the repository) if it's not the default.
    - The `netlify.toml` file in the repo will automatically configure the redirects needed for a single-page app.
4.  **Add Environment Variable**:
    - Go to **Site settings > Build & deploy > Environment > Environment variables**.
    - Add a new variable:
      - **Key**: `VITE_API_KEY`
      - **Value**: Paste your Google AI API key.
5.  **Deploy**: Trigger a new deploy from the "Deploys" tab.

---

## 📂 Project Structure

The project is organized logically to separate concerns and make the codebase easy to navigate.

```
/
├── components/         # Reusable React components (CameraView, ChatView, etc.)
├── hooks/              # Custom React hooks (useCamera)
├── icons/              # SVG icon components
├── services/           # Modules for external communication (aiService.ts)
├── utils/              # Helper functions (imageUtils.ts)
├── .env                # (You create this) Stores the API key locally
├── .gitignore          # Specifies files for Git to ignore
├── App.tsx             # Main application component, manages state
├── index.html          # The entry point of the application
├── index.tsx           # Renders the React application
├── manifest.json       # PWA configuration file
├── README.md           # You are here!
└── sw.js               # Service Worker for offline caching
```
