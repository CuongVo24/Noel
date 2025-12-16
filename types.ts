import React from 'react';

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
  normal?: [number, number, number]; // Added for surface alignment
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

// Robustly augment JSX.IntrinsicElements for React Three Fiber
// This ensures all Three.js elements (mesh, group, etc.) are recognized by TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Additional augmentation for setups where JSX is namespaced under React
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}