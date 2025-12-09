import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { HandGesture } from '../types';

interface HandRecognizerProps {
  onGestureUpdate: (gesture: HandGesture) => void;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17] // Palm
];

const HandRecognizer: React.FC<HandRecognizerProps> = ({ onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lastVideoTime = useRef(-1);
  const requestRef = useRef<number>(0);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setLoaded(true);
      startCamera();
    };

    initMediaPipe();

    return () => {
      cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Browser does not support getUserMedia");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const drawHand = (landmarks: NormalizedLandmark[], ctx: CanvasRenderingContext2D, width: number, height: number, fingerCount: number) => {
    ctx.clearRect(0, 0, width, height);
    
    // Dynamic color based on state
    const isFist = fingerCount === 0;
    const isOpen = fingerCount === 5;
    
    ctx.lineWidth = 3;
    ctx.strokeStyle = isOpen ? '#00FF00' : isFist ? '#FF0000' : '#FFD700'; // Green=Open, Red=Fist, Gold=Neutral
    ctx.fillStyle = isOpen ? '#00FF00' : isFist ? '#FF0000' : '#FFD700';

    // Draw connections
    CONNECTIONS.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    // Draw landmarks
    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw text count
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(`${fingerCount}`, 50, 50);
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      const results = handLandmarkerRef.current.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const wrist = landmarks[0];

        // Finger Counting Logic
        // We compare the distance of the TIP to the WRIST vs the PIP (Knuckle) to the WRIST.
        // If Tip is further, the finger is extended.
        const fingerTips = [4, 8, 12, 16, 20];
        const fingerPips = [2, 6, 10, 14, 18];
        
        let extendedFingers = 0;
        
        for (let i = 0; i < 5; i++) {
            const tip = landmarks[fingerTips[i]];
            const pip = landmarks[fingerPips[i]];
            
            // Calculate distances to wrist
            const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
            const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
            
            // Threshold: Tip must be significantly further than knuckle
            // For thumb (i=0), it's a bit different usually, but this distance heuristic works reasonably well for "Open Hand"
            if (dTip > dPip * 1.1) {
                extendedFingers++;
            }
        }

        // State Determination
        const isFist = extendedFingers === 0; // Strict: No fingers extended
        const isOpen = extendedFingers === 5; // Strict: All 5 fingers extended
        const isPinching = false; // Deprecated in favor of simple counting for now

        // Position tracking
        const handX = -(landmarks[9].x - 0.5) * 2; // Invert X for mirror effect
        const handY = -(landmarks[9].y - 0.5) * 2;
        
        // Draw visualization
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            drawHand(landmarks, ctx, video.videoWidth, video.videoHeight, extendedFingers);
          }
        }

        onGestureUpdate({
          isFist,
          isOpen,
          isPinching,
          handX,
          handY
        });
      } else {
        if (canvasRef.current) {
           const ctx = canvasRef.current.getContext('2d');
           if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="fixed bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-yellow-600 shadow-[0_0_15px_rgba(255,215,0,0.3)] z-50 opacity-90 hover:opacity-100 transition-opacity bg-black">
      {!loaded && <div className="absolute inset-0 flex items-center justify-center text-xs text-yellow-200">Loading Vision...</div>}
      <div className="relative w-full h-full transform scale-x-[-1]">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover" 
          autoPlay 
          playsInline 
          muted
        />
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export default HandRecognizer;