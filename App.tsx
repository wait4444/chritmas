import React, { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import HandRecognizer from './components/HandRecognizer';
import { AppState, DecorationData, PhotoData, HandGesture } from './types';
import { calculateTreePosition, calculateHeartPosition, randomVector } from './utils/math';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial Data Generation
const DECORATION_COUNT = 350; // Richer density
const CHRISTMAS_PALETTE = [
  '#D42426', // Deep Christmas Red
  '#165B33', // Pine Green
  '#FFD700', // Gold
  '#C41E3A', // Cardinal Red
  '#0F4725', // Dark Green
  '#DAA520'  // Goldenrod
];

const INITIAL_DECORATIONS: DecorationData[] = Array.from({ length: DECORATION_COUNT }).map((_, i) => {
  const isSphere = Math.random() > 0.4; 
  const color = CHRISTMAS_PALETTE[Math.floor(Math.random() * CHRISTMAS_PALETTE.length)];
  
  return {
    id: i,
    type: isSphere ? 'sphere' : 'box',
    color: color,
    initialPos: calculateTreePosition(i, DECORATION_COUNT, 4.5, 11),
    heartPos: calculateHeartPosition(3.5),
    scatterPos: randomVector(12),
    scale: Math.random() * 0.2 + 0.1
  };
});

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [handGesture, setHandGesture] = useState<HandGesture>({ 
    isFist: false, isOpen: true, isPinching: false, handX: 0, handY: 0 
  });
  const [showUI, setShowUI] = useState(true);

  // Swipe Detection Refs
  const lastHandX = useRef(0);
  const lastSwipeTime = useRef(0);
  const swipeCooldown = 600; // ms

  // Gesture State Machine & Swipe Logic
  useEffect(() => {
    // 1. State Switching
    const timeout = setTimeout(() => {
      if (handGesture.isFist) {
        setAppState(AppState.TREE);
      } else if (handGesture.isOpen) {
        if (photos.length > 0) {
           setAppState(AppState.ZOOM);
        } else {
           setAppState(AppState.SCATTERED);
        }
      }
    }, 150);

    // 2. Swipe Detection (Only in ZOOM mode with open hand)
    if (appState === AppState.ZOOM && handGesture.isOpen && photos.length > 1) {
      const now = Date.now();
      const deltaX = handGesture.handX - lastHandX.current;
      
      // Threshold for swipe velocity/distance
      if (Math.abs(deltaX) > 0.05 && (now - lastSwipeTime.current > swipeCooldown)) {
         if (deltaX > 0) {
           // Swipe Right (Hand moves right) -> Previous Photo
           setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
         } else {
           // Swipe Left (Hand moves left) -> Next Photo
           setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
         }
         lastSwipeTime.current = now;
      }
    }
    
    lastHandX.current = handGesture.handX;

    return () => clearTimeout(timeout);
  }, [handGesture, appState, photos.length]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos: PhotoData[] = Array.from(e.target.files).map((file: File, i) => {
        const url = URL.createObjectURL(file);
        return {
          id: generateId(),
          url,
          aspectRatio: 1, // Default, updated by Image component eventually if we wanted
          treePos: calculateTreePosition(i * 13 + 10, 100, 5, 8), // Distributed in tree
          scatterPos: randomVector(5)
        };
      });
      setPhotos(prev => {
        // Reset index to new photo if it's the first batch, else keep current
        if (prev.length === 0) setCurrentPhotoIndex(0);
        return [...prev, ...newPhotos];
      });
    }
  };

  const handleResetPhotos = () => {
    setPhotos([]);
    setCurrentPhotoIndex(0);
    setAppState(AppState.SCATTERED);
  };

  const activePhotoId = photos.length > 0 ? photos[currentPhotoIndex].id : null;

  return (
    <div className="w-full h-screen relative bg-[#050505]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene 
          appState={appState} 
          decorations={INITIAL_DECORATIONS} 
          photos={photos}
          handPosition={{ x: handGesture.handX, y: handGesture.handY }}
          activePhotoId={activePhotoId}
        />
      </div>

      {/* UI Overlay */}
      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 transition-opacity duration-1000 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Header */}
        <header className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-600 font-bold drop-shadow-[0_2px_15px_rgba(255,215,0,0.6)] font-serif">
              Lumière Noël
            </h1>
            <p className="text-yellow-100/70 mt-1 font-light tracking-[0.3em] text-xs md:text-sm">
              MAGICAL CHRISTMAS MEMORIES
            </p>
          </div>
        </header>

        {/* Center Prompt if No Photos */}
        {photos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
             <div className="text-center bg-black/60 backdrop-blur-xl p-8 rounded-2xl border border-yellow-500/50 shadow-[0_0_30px_rgba(255,215,0,0.2)] transform hover:scale-105 transition-transform duration-300">
                <h2 className="text-2xl text-yellow-100 font-serif mb-4">Create Your Memory Tree</h2>
                <label className="cursor-pointer inline-flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-800 to-red-600 flex items-center justify-center shadow-lg group-hover:shadow-red-500/50 transition-all mb-3">
                     <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  </div>
                  <span className="text-yellow-200 text-sm tracking-widest font-bold group-hover:text-white">UPLOAD PHOTOS</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
             </div>
          </div>
        )}
        
        {/* Photo Controls (Active when photos exist) */}
        {photos.length > 0 && (
           <div className="absolute top-1/2 right-8 transform -translate-y-1/2 flex flex-col gap-4 pointer-events-auto items-end">
              {/* Add Photo */}
              <label className="w-12 h-12 rounded-full bg-black/50 border border-green-500/50 flex items-center justify-center cursor-pointer hover:bg-green-900/30 transition-all shadow-[0_0_15px_rgba(22,91,51,0.4)] group tooltip-container">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>

              {/* Reset/Modify Photos */}
              <button 
                onClick={handleResetPhotos}
                className="w-12 h-12 rounded-full bg-black/50 border border-red-500/50 flex items-center justify-center cursor-pointer hover:bg-red-900/30 transition-all shadow-[0_0_15px_rgba(212,36,38,0.4)]"
                title="Clear Photos"
              >
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
           </div>
        )}

        {/* Footer / Instructions */}
        <footer className="flex flex-col md:flex-row justify-between items-end gap-4 pointer-events-auto">
           <div className="bg-gradient-to-r from-black/80 to-transparent p-6 rounded-xl border-l-4 border-yellow-500 backdrop-blur-sm max-w-md">
              <h3 className="text-yellow-400 font-serif font-bold mb-3 uppercase tracking-wider text-xs">Magical Gestures</h3>
              <ul className="space-y-3 text-sm text-gray-200 font-light">
                 <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-red-900/80 border border-red-500 flex items-center justify-center text-xs">✊</div>
                    <span><strong className="text-red-400">Fist:</strong> Form Magic Heart</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-green-900/80 border border-green-500 flex items-center justify-center text-xs">🖐️</div>
                    <span><strong className="text-green-400">Open Hand:</strong> View Memories</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-yellow-900/80 border border-yellow-500 flex items-center justify-center text-xs">↔️</div>
                    <span><strong className="text-yellow-400">Swipe Hand:</strong> Switch Photos</span>
                 </li>
              </ul>
           </div>
           
           <div className="text-right">
              <div className="text-xs text-white/40 mb-1 tracking-widest uppercase">Current Magic</div>
              <div className="text-3xl font-serif text-yellow-100 drop-shadow-md">
                {appState === AppState.TREE ? 'Magic Love' : appState === AppState.ZOOM ? 'Memories' : 'Stardust'}
              </div>
              {photos.length > 0 && appState === AppState.ZOOM && (
                <div className="text-xs text-yellow-500 mt-1">Photo {currentPhotoIndex + 1} / {photos.length}</div>
              )}
           </div>
        </footer>

      </div>

      <HandRecognizer onGestureUpdate={setHandGesture} />
      
      <button 
        onClick={() => setShowUI(!showUI)} 
        className="absolute top-4 right-4 z-50 text-white/30 hover:text-white transition-colors pointer-events-auto text-xs uppercase tracking-widest"
      >
        {showUI ? 'Hide UI' : 'Show UI'}
      </button>
    </div>
  );
};

export default App;