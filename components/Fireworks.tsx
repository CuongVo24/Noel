import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

interface FireworksProps {
  position: [number, number, number];
  onComplete: () => void;
}

export const Fireworks: React.FC<FireworksProps> = ({ position, onComplete }) => {
  // Create particle data - Increased Count to 300
  const count = 300;
  const [positions, colors, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = [];
    
    // HDR Colors (Values > 1.0 for Bloom) - Expanded Palette
    const colorPalette = [
      [20, 0, 0],   // Bright Red
      [20, 16, 0],  // Bright Gold
      [0, 20, 0],   // Bright Green
      [0, 20, 20],  // Bright Cyan
      [0, 0, 20],   // Bright Blue
      [20, 0, 20],  // Bright Magenta
      [20, 10, 0],  // Bright Orange
    ];

    for (let i = 0; i < count; i++) {
      // Start at origin (relative to group)
      pos[i * 3] = 0;
      // OFFSET EMISSION: Start slightly below the star (The Tail)
      pos[i * 3 + 1] = -0.6; 
      pos[i * 3 + 2] = 0;

      // Random velocity outward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 0.1 + Math.random() * 0.2;
      
      vel.push({
        x: speed * Math.sin(phi) * Math.cos(theta),
        y: speed * Math.sin(phi) * Math.sin(theta),
        z: speed * Math.cos(phi)
      });

      // Color
      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return [pos, col, vel];
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    
    if (timeRef.current > 2.0) {
        onComplete();
        return;
    }

    if (pointsRef.current) {
        const currentPositions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < count; i++) {
            // Apply Velocity
            currentPositions[i * 3] += velocities[i].x;
            currentPositions[i * 3 + 1] += velocities[i].y;
            currentPositions[i * 3 + 2] += velocities[i].z;
            
            // Gravity
            velocities[i].y -= 0.005; 
            
            // Drag
            velocities[i].x *= 0.98;
            velocities[i].y *= 0.98;
            velocities[i].z *= 0.98;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Fade out
        const material = pointsRef.current.material as THREE.PointsMaterial;
        material.opacity = 1 - (timeRef.current / 2);
    }
  });

  return (
    <group position={position}>
      <points ref={pointsRef} frustumCulled={false} renderOrder={999}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={count}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false} // Enable bloom
        />
      </points>
      <pointLight color="#ffd700" intensity={3} distance={5} decay={2} />
    </group>
  );
};
