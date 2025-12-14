import { Vector3 } from 'three';
import { ThreeElements } from '@react-three/fiber';

export interface Player {
  id: string;
  name: string;
  color: string;
  position: [number, number, number]; // Simulated cursor position
}

export type DecorationType = 'orb' | 'star' | 'candy' | 'stocking';

export interface Decoration {
  id: string;
  position: [number, number, number];
  type: DecorationType;
  color: string;
  sender: string;
  message: string;
  timestamp: number;
}

export interface Gift {
  id: string;
  position: [number, number, number];
  sender: string;
  message: string;
  color: string;
  opened: boolean;
}

export type GameState = 'LOBBY' | 'DECORATING' | 'CEREMONY';

export interface CeremonyState {
  active: boolean;
  progress: number; // 0 to 100
  target: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}