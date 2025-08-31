import { useState, useRef, useCallback, useEffect } from 'react';

// Define a structure for camera capabilities
interface CameraCapabilities {
  flash: { isSupported: boolean };
  zoom: { isSupported: boolean; min: number; max: number; step: number };
}

/**
 * A custom hook to manage camera access and state.
 * It handles starting, stopping, switching cameras, controlling flash, and zoom.
 * This abstracts away the browser's MediaDevices API complexity from the UI components.
 */
export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(undefined);
  
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    flash: { isSupported: false },
    zoom: { isSupported: false, min: 1, max: 1, step: 0.1 },
  });
  
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [zoom, setZoom] = useState(1);

  /**
   * Stops all tracks on the current media stream to turn off the camera.
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * Requests camera access and starts the video stream for the currently selected device.
   * Handles common errors like permission denial or no camera found.
   */
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsFlashOn(false);

    if (!currentDeviceId) {
      // This can happen if enumeration hasn't completed or no devices are found.
      // The enumeration logic will set an appropriate error message.
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: currentDeviceId } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Check for capabilities after a short delay to ensure the track is ready
        setTimeout(() => {
          const [track] = stream.getVideoTracks();
          if (track) {
            const trackCapabilities = track.getCapabilities() as any;
            
            const newCapabilities: CameraCapabilities = {
              flash: { isSupported: !!trackCapabilities.torch },
              zoom: {
                isSupported: !!trackCapabilities.zoom,
                min: trackCapabilities.zoom?.min || 1,
                max: trackCapabilities.zoom?.max || 1,
                step: trackCapabilities.zoom?.step || 0.1,
              },
            };
            setCapabilities(newCapabilities);
            setZoom(newCapabilities.zoom.isSupported ? trackCapabilities.zoom.min : 1);
          }
        }, 500);
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      let message = "Could not access the camera. Please check your browser permissions and ensure a camera is connected.";
      
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          message = "Camera access was denied. Please grant permission in your browser's settings and try again.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          message = "The selected camera was not found on this device.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            message = "Your camera may be in use by another application. Please close it and try again.";
        }
      }
      setCameraError(message);
    }
  }, [stopCamera, currentDeviceId]);
  
  // Effect to enumerate devices on mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission early
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        
        if (videoDevices.length > 0) {
          setDevices(videoDevices);
          // Prefer the 'environment' (back) camera first
          const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
          setCurrentDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
        } else {
          setCameraError("No camera found on this device.");
        }
      } catch (err) {
          console.error("Could not enumerate devices:", err);
          if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
            setCameraError("Camera access was denied. Please grant permission in your browser's settings and try again.");
          } else {
            setCameraError("Could not list available cameras.");
          }
      }
    };
    enumerateDevices();
  }, []);

  // Effect to start the camera when the selected device changes
  useEffect(() => {
      if (currentDeviceId) {
        startCamera();
      }
      return () => {
          stopCamera();
      };
  }, [currentDeviceId, startCamera, stopCamera]);


  /**
   * Toggles the camera's flash/torch on or off.
   */
  const toggleFlash = useCallback(async () => {
    if (!capabilities.flash.isSupported || !streamRef.current) return;

    const [track] = streamRef.current.getVideoTracks();
    if (track) {
      try {
        const nextFlashState = !isFlashOn;
        await track.applyConstraints({
          advanced: [{ torch: nextFlashState } as any],
        });
        setIsFlashOn(nextFlashState);
      } catch (err) {
        console.error("Failed to toggle flash:", err);
      }
    }
  }, [isFlashOn, capabilities.flash.isSupported]);

  /**
   * Cycles to the next available camera device.
   */
  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setCurrentDeviceId(devices[nextIndex].deviceId);
  }, [devices, currentDeviceId]);

  /**
   * Sets the zoom level of the camera.
   */
  const setZoomValue = useCallback(async (value: number) => {
    if (!capabilities.zoom.isSupported || !streamRef.current) return;
    
    setZoom(value); // Update state immediately for responsive UI
    const [track] = streamRef.current.getVideoTracks();
    if (track) {
        try {
            await track.applyConstraints({ advanced: [{ zoom: value } as any] });
        } catch (err) {
            console.error("Failed to set zoom:", err);
        }
    }
  }, [capabilities.zoom.isSupported]);

  return {
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
    setZoom: setZoomValue,
  };
};
