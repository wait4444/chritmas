import * as THREE from 'three';

// Generate a spiral cone shape
export const calculateTreePosition = (index: number, total: number, radiusBottom: number, height: number): [number, number, number] => {
  const y = (index / total) * height; // Height from 0 to h
  const radius = radiusBottom * (1 - index / total); // Radius shrinks as y goes up
  const angle = index * 0.5; // Spiral density
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Center vertically
  return [x, y - height / 2, z];
};

// Generate a 3D Heart shape
export const calculateHeartPosition = (scale: number): [number, number, number] => {
  // Parametric equation for a heart
  const t = Math.random() * Math.PI * 2;
  const u = Math.random() * Math.PI; // For 3D volume
  
  // Basic 2D heart shape
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
  
  // Add depth variation
  const z = (Math.random() - 0.5) * 6; 

  return [x * scale * 0.05, y * scale * 0.05 + 2, z];
};

export const randomVector = (scale: number): [number, number, number] => {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = Math.pow(Math.random(), 1/3) * scale; // Uniform sphere distribution

  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  ];
};