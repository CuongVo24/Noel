import { create } from 'zustand';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export interface FireworkData {
    id: string;
    position: THREE.Vector3;
}

export interface ExplosionData {
    id: string;
    position: THREE.Vector3;
    color: string;
}

export interface MeteorData {
    id: string;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
}

interface VFXState {
    fireworks: FireworkData[];
    explosions: ExplosionData[];
    meteors: MeteorData[];

    addFirework: (position: THREE.Vector3) => void;
    removeFirework: (id: string) => void;

    addExplosion: (position: THREE.Vector3, color: string) => void;
    removeExplosion: (id: string) => void;

    spawnMeteor: () => void;
    removeMeteor: (id: string) => void;
}

export const useVFXStore = create<VFXState>((set) => ({
    fireworks: [],
    explosions: [],
    meteors: [],

    addFirework: (position) => set((state) => ({
        fireworks: [...state.fireworks, { id: uuidv4(), position }]
    })),

    removeFirework: (id) => set((state) => ({
        fireworks: state.fireworks.filter(f => f.id !== id)
    })),

    addExplosion: (position, color) => set((state) => ({
        explosions: [...state.explosions, { id: uuidv4(), position, color }]
    })),

    removeExplosion: (id) => set((state) => ({
        explosions: state.explosions.filter(e => e.id !== id)
    })),

    spawnMeteor: () => {
        // Generate random start and end points in the sky dome
        const startX = (Math.random() - 0.5) * 200;
        const startY = 50 + Math.random() * 50;
        const startZ = -100; // Far back

        const endX = startX + (Math.random() - 0.5) * 100;
        const endY = startY - (30 + Math.random() * 20);
        const endZ = startZ + (Math.random() - 0.5) * 50;

        const newMeteor: MeteorData = {
            id: uuidv4(),
            startPos: new THREE.Vector3(startX, startY, startZ),
            endPos: new THREE.Vector3(endX, endY, endZ)
        };

        set((state) => ({
            meteors: [...state.meteors, newMeteor]
        }));
    },

    removeMeteor: (id) => set((state) => ({
        meteors: state.meteors.filter(m => m.id !== id)
    })),
}));