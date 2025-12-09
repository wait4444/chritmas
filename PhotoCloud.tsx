
import React, { useRef, useMemo } from 'react';
import { Image } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState, PhotoData } from '../types';

interface PhotoCloudProps {
  appState: AppState;
  photos: PhotoData[];
  selectedPhotoId: string | null;
}

const PhotoCloud: React.FC<PhotoCloudProps> = ({ appState, photos, selectedPhotoId }) => {
  return (
    <group>
      {photos.map((photo) => (
        <PhotoItem 
          key={photo.id} 
          photo={photo} 
          isActive={selectedPhotoId === photo.id}
          appState={appState}
        />
      ))}
    </group>
  );
};

const PhotoItem: React.FC<{ photo: PhotoData; isActive: boolean; appState: AppState }> = ({ photo, isActive, appState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const imageRef = useRef<any>(null); // Ref for the Image component
  
  // Festive Frame Color
  const frameColor = useMemo(() => {
    const colors = ['#D42426', '#165B33', '#FFD700'];
    return new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    const isZoomMode = appState === AppState.ZOOM;

    // Target Position Calculation
    const targetPos = new THREE.Vector3();
    let targetScale = 1;
    let targetRot = new THREE.Euler(0, 0, 0);

    if (isZoomMode) {
      if (isActive) {
        // Active Photo: Center screen, large
        targetPos.set(0, 0, 9); 
        targetScale = 3.5; 
        targetRot.set(0, 0, 0);
        targetPos.y += Math.sin(t) * 0.1;
      } else {
        // Inactive photos: Hide them behind or scatter
        targetPos.set(...photo.treePos);
        targetPos.z -= 10;
        targetScale = 0; 
      }
    } else if (appState === AppState.TREE) {
      // HEART Mode (Fist): Cluster in the center of the heart
      // Give them a small random offset near the center
      targetPos.set(0, 2, 0); 
      targetPos.x += Math.sin(t + parseInt(photo.id, 36)) * 0.5;
      targetPos.y += Math.cos(t * 0.8 + parseInt(photo.id, 36)) * 0.5;
      
      targetScale = 0.5; // Small icons inside the heart
      targetRot.set(0, 0, Math.sin(t) * 0.1);
    } else {
      // Scattered Mode
      targetPos.set(...photo.scatterPos);
      targetPos.y += Math.sin(t + parseInt(photo.id, 36)) * 0.2;
      targetScale = 1.2;
      groupRef.current.lookAt(0, 0, 20);
    }

    // Animation Lerp
    const lerpSpeed = isActive ? 3.0 * delta : 2.0 * delta;
    groupRef.current.position.lerp(targetPos, lerpSpeed);
    
    // Scale Lerp
    const currentScale = groupRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpSpeed);
    groupRef.current.scale.setScalar(nextScale);
    
    // Rotation Lerp
    if (!isZoomMode && appState === AppState.SCATTERED) {
       groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.1;
    } else {
       groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRot.x, lerpSpeed);
       groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.y, lerpSpeed);
       groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRot.z, lerpSpeed);
    }
    
    // Frame Opacity
    if (materialRef.current) {
        const targetOpacity = (isZoomMode && !isActive) ? 0 : 1;
        materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, lerpSpeed);
        materialRef.current.transparent = true;
    }

    // Image Opacity handling
    if (imageRef.current && imageRef.current.material) {
        const targetOpacity = (isZoomMode && !isActive) ? 0 : 1;
        imageRef.current.material.opacity = THREE.MathUtils.lerp(imageRef.current.material.opacity, targetOpacity, lerpSpeed);
    }
  });

  return (
    <group ref={groupRef}>
       {/* Photo Frame */}
       <mesh position={[0, 0, -0.05]}>
         <boxGeometry args={[1.08 * photo.aspectRatio, 1.08, 0.05]} />
         <meshStandardMaterial 
            ref={materialRef}
            color={frameColor} 
            emissive={frameColor} 
            emissiveIntensity={0.6} 
            roughness={0.1} 
            metalness={0.9} 
         />
       </mesh>

       <Image 
        ref={imageRef}
        url={photo.url}
        transparent
        scale={[photo.aspectRatio, 1]} 
        toneMapped={false} 
      />

      {/* Magical Decoration Ring */}
      <FestiveParticles visible={isActive && appState === AppState.ZOOM} color={frameColor} />
    </group>
  );
};

// Custom Particle Ring Component
const FestiveParticles: React.FC<{ visible: boolean, color: THREE.Color }> = ({ visible, color }) => {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const palette = useMemo(() => [
      new THREE.Color('#D42426'),
      new THREE.Color('#165B33'),
      new THREE.Color('#FFD700')
  ], []);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    
    const t = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 0.8 + Math.sin(t * 2 + i) * 0.1; 
        
        const x = Math.cos(angle + t * 0.5) * radius;
        const y = Math.sin(angle + t * 0.5) * radius;
        const z = Math.sin(angle * 3 + t) * 0.2; 

        dummy.position.set(x, y, z);
        dummy.scale.setScalar(0.05 + Math.sin(t * 5 + i) * 0.02);
        dummy.rotation.set(t, t, t);
        dummy.updateMatrix();
        
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, palette[i % palette.length]);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} visible={visible}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
  )
}

export default PhotoCloud;