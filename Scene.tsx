import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sparkles, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import Decorations from './Decorations';
import PhotoCloud from './PhotoCloud';
import { AppState, DecorationData, PhotoData } from '../types';

interface SceneProps {
  appState: AppState;
  decorations: DecorationData[];
  photos: PhotoData[];
  handPosition: { x: number, y: number };
  activePhotoId: string | null;
}

const CameraController = ({ appState, handPosition }: { appState: AppState, handPosition: { x: number, y: number } }) => {
  const { camera } = useThree();
  const initialPos = useRef(new THREE.Vector3(0, 0, 22)); // Moved back to see full tree

  useFrame((state, delta) => {
    let targetPos = initialPos.current.clone();

    if (appState === AppState.SCATTERED) {
      // Rotate camera around center based on hand X
      // Fixed Height: We do NOT use handPosition.y for height anymore to keep view stable
      const angle = handPosition.x * 0.8; 
      const radius = 22;
      targetPos.x = Math.sin(angle) * radius;
      targetPos.z = Math.cos(angle) * radius;
      targetPos.y = 2; // Fixed comfortable height slightly looking down/center
      
      camera.lookAt(0, 0, 0);
    } else if (appState === AppState.ZOOM) {
        // Zoom mode: Ensure full visibility
        // Camera moved back to z=20 (was 14) to fit the 3.5 scale photo completely in FOV
        targetPos.set(handPosition.x * 1.5, 0, 20);
        // Look at the photo plane (z=9), not the origin, to keep it centered
        camera.lookAt(0, 0, 9);
    } else {
        // Tree Mode: Classic full view
        // Fixed position to ensure the whole cone is visible
        targetPos.set(0, 0, 24); 
        camera.lookAt(0, 1, 0);
    }

    camera.position.lerp(targetPos, delta * 2.0); // Slightly faster catch-up
  });
  
  return null;
}

const Scene: React.FC<SceneProps> = ({ appState, decorations, photos, handPosition, activePhotoId }) => {
  return (
    <Canvas 
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.2 }}
      camera={{ position: [0, 0, 24], fov: 45 }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#050202']} />
      
      <CameraController appState={appState} handPosition={handPosition} />

      {/* Lighting & Environment */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <pointLight position={[-10, -5, 5]} intensity={0.8} color="#D42426" />
      <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={1} color="#fff" />
      <Environment preset="night" /> 

      {/* Background Atmosphere */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      <Sparkles count={150} scale={20} size={3} speed={0.2} opacity={0.3} color="#FFD700" />

      {/* Main Content */}
      <group position={[0, -4, 0]}> {/* Shifted down slightly to center the tall tree */}
         <Decorations appState={appState} decorations={decorations} />
         <PhotoCloud appState={appState} photos={photos} selectedPhotoId={activePhotoId} />
         
         {/* Tree Topper */}
         <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
            <mesh position={[0, appState === AppState.TREE ? 10.5 : 6, 0]}>
                <octahedronGeometry args={[0.7, 0]} />
                <meshStandardMaterial color="#FFF" emissive="#FFD700" emissiveIntensity={3} toneMapped={false} />
                <pointLight intensity={1} distance={5} color="#FFD700" />
            </mesh>
         </Float>
      </group>

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.4} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
        <Noise opacity={0.03} />
      </EffectComposer>
    </Canvas>
  );
};

export default Scene;