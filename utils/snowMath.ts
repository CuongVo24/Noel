import * as THREE from 'three';
import { SNOW_GLOBE_RADIUS } from '../constants';

/**
 * Calculates the height (Y) of the snow terrain at a given (x, z) coordinate.
 * This function ensures objects sit perfectly on top of the procedural noise
 * and respect the flat "Safe Zone" in the center.
 */
export const getSnowHeight = (x: number, z: number): number => {
    const r = Math.sqrt(x * x + z * z);
    
    // CONFIGURATION (Must match SnowGlobe visual logic)
    const SAFE_RADIUS = 4.5;     // Radius where ground is perfectly flat (y=0)
    const BLEND_ZONE = 3.0;      // Distance over which noise fades in
    const MENISCUS_START = 10.5; // Radius where snow starts curving up the glass

    let h = 0;

    // 1. RUGGED NOISE (Only applied outside the Safe Zone)
    if (r > SAFE_RADIUS) {
        const freq = 0.5;
        // Primary Lumps
        let noise = Math.sin(x * freq) * Math.cos(z * freq) * 0.5;
        
        // Secondary Detail
        noise += Math.sin(x * 1.5 + z * 2.0) * 0.15;
        
        // Blend from flat center (0) to full noise (1) using smoothstep
        const blend = THREE.MathUtils.smoothstep(r, SAFE_RADIUS, SAFE_RADIUS + BLEND_ZONE);
        
        // EDGE MASK: Fade noise out as we approach the glass wall to prevent jagged artifacts
        // Starts fading at R-2.0, completely flat by R-0.5
        const edgeMask = 1.0 - THREE.MathUtils.smoothstep(r, SNOW_GLOBE_RADIUS - 2.0, SNOW_GLOBE_RADIUS - 0.5);

        h = noise * blend * edgeMask;
    }

    // 2. MENISCUS CURVE (Edges)
    // Simulates snow piling up against the glass walls
    if (r > MENISCUS_START) {
        const distToEdge = r - MENISCUS_START;
        h += Math.pow(distToEdge, 2.5) * 0.2;
    }

    return h;
};
