import React, { useRef, useCallback, useState, useEffect } from 'react';
import { getQuickObjectName, RateLimitError, ConfigError } from '../services/aiService';
import { useCamera } from '../hooks/useCamera';
import { dataUrlToBase64 } from '../utils/imageUtils';
import { IconClose } from '../icons/IconClose';
import { IconCameraError } from '../icons/IconCameraError';
import { IconSpinner } from '../icons/IconSpinner';
import { IconFocus } from '../icons/IconFocus';
import { IconFlash } from '../icons/IconFlash';
import { IconSwitchCamera } from '../icons/IconSwitchCamera';

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  onConfigError: (message: string) => void;
}

/**
 * Renders the camera feed and handles all user interactions related to it,
 * such as taking a picture, toggling real-time identification, and tap-to-identify.
 */
export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose, onConfigError }) => {
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout.
  const realtimeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedIdentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Custom Hook ---
  // Encapsulates all camera logic (starting, stopping, errors, flash, zoom, switching)
  const { 
    videoRef, 
    cameraError, 
    startCamera, 
    stopCamera,
    isFlashOn,
    capabilities,
    toggleFlash,
    switchCamera,
    devices,
    zoom,
    setZoom,
  } = useCamera();

  // --- State ---
  const [isRealtimeMode, setIsRealtimeMode] = useState<boolean>(false);
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [identifiedObject, setIdentifiedObject] = useState<string | null>(null);
  const [isFocusedIdentification, setIsFocusedIdentification] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number; id: number } | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // --- Effects ---
  // This effect manages the real-time identification loop.
  useEffect(() => {
    // If real-time mode is off, or a focused identification is active, do nothing.
    if (!isRealtimeMode || isFocusedIdentification) {
      if (!isFocusedIdentification) setIdentifiedObject(null); // Clear general result if not focused
      return;
    }

    let isCancelled = false;
    const identifyAndRepeat = async () => {
      await identifyFrame(videoRef.current); // Identify the current frame
      // If the component is still mounted and mode is active, repeat after a delay.
      if (!isCancelled) {
        realtimeTimeoutRef.current = setTimeout(identifyAndRepeat, 5000);
      }
    };

    identifyAndRepeat();

    // Cleanup function to stop the loop when the component unmounts or mode changes.
    return () => {
      isCancelled = true;
      if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current);
    };
  }, [isRealtimeMode, isFocusedIdentification]); // Reruns when real-time mode or focus state changes.

  // This effect will hide the focus indicator after 2 seconds.
  useEffect(() => {
    if (focusIndicator) {
      const timer = setTimeout(() => {
        setFocusIndicator(null);
      }, 2000); // Duration matches the animation
      return () => clearTimeout(timer);
    }
  }, [focusIndicator]);

  // Cleanup effect for rate limit timeout to avoid memory leaks
  useEffect(() => {
    return () => {
      if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
    }
  }, []);


  // --- Core Functions ---
  /**
   * Captures a frame from the video, sends it to the AI for identification,
   * and updates the state with the result.
   * @param video The video element to capture a frame from.
   * @param crop Optional: A region of the video to crop for focused identification.
   */
  const identifyFrame = useCallback(async (
    video: HTMLVideoElement | null,
    crop?: { sx: number; sy: number; sWidth: number; sHeight: number }
  ) => {
    if (!video || !canvasRef.current || !video.videoWidth || isIdentifying) return;

    setIsIdentifying(true);
    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // Set canvas size for processing
      const aspectRatio = video.videoWidth / video.videoHeight;
      canvas.width = 640;
      canvas.height = 640 / aspectRatio;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      let imageDataUrl: string;
      if (crop) {
        // Create a smaller canvas for the cropped image
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = crop.sWidth;
        croppedCanvas.height = crop.sHeight;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) return;
        croppedCtx.drawImage(canvas, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, crop.sWidth, crop.sHeight);
        imageDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.8);
      } else {
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      }
      
      const base64Image = dataUrlToBase64(imageDataUrl);
      const result = await getQuickObjectName(base64Image);
      setIdentifiedObject(result);

    } catch (err: any) {
      console.error("Identification failed:", err);
      if (err instanceof ConfigError) {
        onConfigError(err.message);
        setIsRealtimeMode(false); // Turn off real-time mode to stop requests
      } else if (err instanceof RateLimitError) {
        setRateLimitError(err.message);
        setIsRealtimeMode(false); // Turn off real-time mode to stop requests
        // Clear the error message after 5 seconds
        if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
        rateLimitTimeoutRef.current = setTimeout(() => setRateLimitError(null), 5000);
      }
      // Fail silently for other errors to not disrupt the continuous user experience
    } finally {
      setIsIdentifying(false);
    }
  }, [isIdentifying, onConfigError]);

  /**
   * Handles the final photo capture for detailed analysis.
   */
  const handleCapture = () => {
    if (isCapturing || !videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    // Flash effect
    setTimeout(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        // Capture a full-resolution image
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        
        onCapture(imageDataUrl); // Pass the image data to the App component
        stopCamera();
      }
    }, 300);
  };

  /**
   * Handles tap events on the video feed to trigger focused identification.
   */
  const handleVideoClick = useCallback(async (event: React.MouseEvent<HTMLVideoElement>) => {
    // Only works in real-time mode and if not already identifying
    if (!isRealtimeMode || !videoRef.current || isIdentifying) return;

    const video = event.currentTarget;
    const rect = video.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Show a visual indicator where the user tapped
    setFocusIndicator({ x, y, id: Date.now() });

    // Define the crop area around the tap coordinates
    const cropSize = 150;
    const scaleX = video.videoWidth / rect.width;
    const scaleY = video.videoHeight / rect.height;
    const crop = {
      sx: Math.max(0, (x * scaleX) - cropSize / 2),
      sy: Math.max(0, (y * scaleY) - cropSize / 2),
      sWidth: cropSize,
      sHeight: cropSize,
    };
    
    setIsFocusedIdentification(true);
    await identifyFrame(video, crop);
    
    // The focused result stays on screen for 5 seconds
    if (focusedIdentTimeoutRef.current) clearTimeout(focusedIdentTimeoutRef.current);
    focusedIdentTimeoutRef.current = setTimeout(() => {
      setIsFocusedIdentification(false);
    }, 5000);
  }, [isRealtimeMode, identifyFrame, isIdentifying]);


  // --- Render Logic ---
  return (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-75 z-30"
        aria-label="Close camera"
      >
        <IconClose />
      </button>

      {cameraError ? (
        <div className="text-center p-8 text-white flex flex-col items-center justify-center h-full max-w-md mx-auto">
          <IconCameraError className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Camera Unavailable</h2>
          <p className="text-gray-400 mb-6">{cameraError}</p>
          <button
            onClick={() => startCamera()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onClick={handleVideoClick}
            className="w-full h-full object-cover"
          />
          {focusIndicator && (
            <div
              key={focusIndicator.id}
              className="absolute w-20 h-20 border-2 border-yellow-400 rounded-full pointer-events-none animate-focus-display z-20"
              style={{
                left: `${focusIndicator.x}px`,
                top: `${focusIndicator.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Zoom Slider */}
          {capabilities.zoom.isSupported && (
            <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-48 md:h-64 flex items-center justify-center z-20">
              <input
                type="range"
                min={capabilities.zoom.min}
                max={capabilities.zoom.max}
                step={capabilities.zoom.step}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-48 md:w-64 h-1.5 appearance-none bg-white/30 rounded-full outline-none transition-all duration-300 ease-in-out origin-center -rotate-90"
                style={{ backgroundSize: `${(zoom - capabilities.zoom.min) * 100 / (capabilities.zoom.max - capabilities.zoom.min)}% 100%` }}
              />
            </div>
          )}

          {/* Top banner for displaying identification results or rate limit errors */}
          {(isRealtimeMode || rateLimitError) && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 backdrop-blur-md text-white px-4 py-2 rounded-xl text-center min-w-[180px] z-10 transition-all duration-300 ${rateLimitError ? 'bg-red-600/70' : 'bg-black/40'}`}>
              {rateLimitError ? (
                <p className="font-semibold text-base animate-fade-in">{rateLimitError}</p>
              ) : isIdentifying ? (
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm italic text-gray-300">Identifying</span>
                  <IconSpinner className="w-4 h-4" />
                </div>
              ) : identifiedObject ? (
                <div className="flex items-center gap-2">
                  {isFocusedIdentification && <IconFocus className="w-5 h-5 text-yellow-400" />}
                  <p className="font-bold text-lg capitalize animate-fade-in">{identifiedObject}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-300">Point at an object</p>
              )}
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-center items-center space-x-16">
            {/* Real-time mode button */}
            <button
              onClick={() => setIsRealtimeMode(prev => !prev)}
              className={`px-4 py-3 rounded-full text-white text-sm font-semibold transition-all duration-300 z-10 ${isRealtimeMode ? 'bg-purple-600 animate-pulse-bright' : 'bg-black/50 hover:bg-black/75'}`}
              aria-label={isRealtimeMode ? 'Stop real-time identification' : 'Start real-time identification'}
            >
              Real-time AI
            </button>

            {/* Shutter button */}
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className={`w-20 h-20 rounded-full border-4 border-white bg-white bg-opacity-30 transition-all duration-300 ease-in-out active:scale-95 disabled:cursor-not-allowed ${isCapturing ? 'scale-90 !border-purple-500 ring-4 ring-purple-500 ring-offset-2 ring-offset-black' : 'hover:bg-opacity-50'}`}
              aria-label="Capture photo"
            ></button>
            
            <div className="flex items-center space-x-4">
              {/* Flash toggle button */}
              {capabilities.flash.isSupported && (
                <button
                  onClick={toggleFlash}
                  className={`flex items-center gap-2 p-3 rounded-full text-sm font-semibold transition-all duration-300 z-10 ${isFlashOn ? 'bg-yellow-500 text-gray-900 animate-pulse-yellow' : 'bg-black/50 text-white hover:bg-black/75'}`}
                  aria-label={isFlashOn ? 'Turn off flash' : 'Turn on flash'}
                >
                  <IconFlash on={isFlashOn} className="w-5 h-5" />
                </button>
              )}
              {/* Camera Switch Button */}
              {devices.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="p-3 rounded-full bg-black/50 hover:bg-black/75 text-white transition-colors duration-300 z-10"
                    aria-label="Switch camera"
                  >
                    <IconSwitchCamera className="w-5 h-5" />
                  </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};