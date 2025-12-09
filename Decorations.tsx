
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState, DecorationData } from '../types';

interface DecorationsProps {
  appState: AppState;
  decorations: DecorationData[];
}

const Decorations: React.FC<DecorationsProps> = ({ appState, decorations }) => {
  const spheres = useMemo(() => decorations.filter(d => d.type === 'sphere'), [decorations]);
  const boxes = useMemo(() => decorations.filter(d => d.type === 'box'), [decorations]);

  return (
    <group>
      <InstancedGroup data={spheres} geometry={new THREE.SphereGeometry(1, 16, 16)} appState={appState} />
      <InstancedGroup data={boxes} geometry={new THREE.BoxGeometry(1.5, 1.5, 1.5)} appState={appState} />
    </group>
  );
};

const InstancedGroup = ({ data, geometry, appState }: { data: DecorationData[], geometry: THREE.BufferGeometry, appState: AppState }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const lerpFactor = 2.0 * delta; // Speed of transition
    const t = state.clock.elapsedTime;

    // Global Rotation logic
    if (appState === AppState.ZOOM) {
        // In Photo Mode: Rotate the tree/heart background slowly
        meshRef.current.rotation.y += delta * 0.2; 
    } else if (appState === AppState.TREE) {
        // In Heart Mode (Fist): Gentle pulse/sway
        meshRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
    } else {
        // Scattered: Slow drift
         meshRef.current.rotation.y += delta * 0.05; 
    }

    data.forEach((item, i) => {
      let targetPos: THREE.Vector3;
      
      if (appState === AppState.SCATTERED) {
         targetPos = new THREE.Vector3(...item.scatterPos);
         targetPos.y += Math.sin(t + item.id) * 0.05;
      } else if (appState === AppState.TREE) {
         // FIST GESTURE: Form a HEART instead of a Tree cone
         targetPos = new THREE.Vector3(...item.heartPos);
         // Add a heartbeat pulse effect
         const pulse = 1 + Math.sin(t * 3) * 0.05;
         targetPos.multiplyScalar(pulse);
      } else {
         // ZOOM MODE: Default to Tree formation as background for photos
         targetPos = new THREE.Vector3(...item.initialPos);
      }

      // Read current instance matrix to get position
      meshRef.current.getMatrixAt(i, tempObj.matrix);
      tempObj.matrix.decompose(tempObj.position, tempObj.quaternion, tempObj.scale);

      // Interpolate position
      tempObj.position.lerp(targetPos, lerpFactor);
      
      // Rotate individual decoration
      tempObj.rotation.x += 0.01;
      tempObj.rotation.y += 0.015;
      
      // Update Scale
      const targetScale = (appState === AppState.TREE) ? item.scale * 0.8 : (appState === AppState.ZOOM ? item.scale : item.scale * 1.2);
      tempObj.scale.setScalar(THREE.MathUtils.lerp(tempObj.scale.x, targetScale, lerpFactor));

      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, data.length]}>
      {/* Luxurious Physical Material */}
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.8} 
        envMapIntensity={1.5}
      />
      {data.map((d, i) => (
        <ColorSetter key={i} index={i} color={d.color} meshRef={meshRef} />
      ))}
    </instancedMesh>
  )
}

const ColorSetter: React.FC<{ index: number, color: string, meshRef: React.RefObject<THREE.InstancedMesh> }> = ({ index, color, meshRef }) => {
  React.useLayoutEffect(() => {
    if (meshRef.current) {
      const c = new THREE.Color(color);
      meshRef.current.setColorAt(index, c);
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [color, index, meshRef]);
  return null;
}

export default Decorations;