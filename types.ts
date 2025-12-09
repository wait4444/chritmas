export enum AppState {
  TREE = 'TREE',          // Elements form a Heart/Tree
  SCATTERED = 'SCATTERED', // Elements float chaotically
  ZOOM = 'ZOOM'           // Focus on a specific photo
}

export interface DecorationData {
  id: number;
  type: 'sphere' | 'box' | 'cane';
  color: string;
  initialPos: [number, number, number]; // Tree position
  heartPos: [number, number, number];   // Heart position
  scatterPos: [number, number, number]; // Random position
  scale: number;
}

export interface PhotoData {
  id: string;
  url: string;
  aspectRatio: number;
  treePos: [number, number, number];
  scatterPos: [number, number, number];
}

export interface HandGesture {
  isFist: boolean;
  isOpen: boolean;
  isPinching: boolean;
  handX: number; // Normalized -1 to 1
  handY: number; // Normalized -1 to 1
}