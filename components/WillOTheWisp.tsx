import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WispProps {
  position: [number, number, number];
  color?: string;
}

export const WillOTheWisp: React.FC<WispProps> = ({ position, color }) => {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Randomize initial phase for movement so they don't sync up
  const [offset] = useState(() => Math.random() * 100);
  
  // Choose a ghostly color if none provided
  const [wispColor] = useState(() => {
      if (color) return color;
      const hues = [
          '#00ffff', // Cyan/Eerie Blue
          '#00ffaa', // Sickly Green
          '#ffaa00', // Pale Orange
          '#b388ff'  // Lavender
      ];
      return hues[Math.floor(Math.random() * hues.length)];
  });

  useFrame((state) => {
    const t = state.clock.getElapsedTime() + offset;
    
    if (groupRef.current) {
        // Floating Sine Wave Movement
        // Hover vertically
        groupRef.current.position.y = position[1] + 1.5 + Math.sin(t * 0.5) * 0.3;
        
        // Drift Horizontally (Lissajous figure-like)
        groupRef.current.position.x = position[0] + Math.sin(t * 0.3) * 0.5;
        groupRef.current.position.z = position[2] + Math.cos(t * 0.2) * 0.5;
        
        // Gentle Rotation
        groupRef.current.rotation.y += 0.01;
        groupRef.current.rotation.z = Math.sin(t) * 0.1;
    }
    
    // Pulse light intensity
    if (lightRef.current) {
        lightRef.current.intensity = 1 + Math.sin(t * 2) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position}>
        {/* Core Glow */}
        <mesh castShadow={false} frustumCulled={false}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
                color={wispColor}
                emissive={wispColor}
                emissiveIntensity={3} 
                transparent
                opacity={0.8}
                toneMapped={false} // Crucial for Bloom
            />
        </mesh>
        
        {/* Outer Halo */}
        <mesh scale={1.5} frustumCulled={false}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial 
                color={wispColor}
                transparent
                opacity={0.2}
                depthWrite={false}
            />
        </mesh>

        {/* Light Source */}
        <pointLight 
            ref={lightRef} 
            color={wispColor} 
            distance={5} 
            decay={2} 
        />
        
        {/* Particles trailing (Simple dots) */}
        {Array.from({ length: 3 }).map((_, i) => (
             <WispParticle key={i} parentColor={wispColor} />
        ))}
    </group>
  );
};

const WispParticle = ({ parentColor }: { parentColor: string }) => {
    const ref = useRef<THREE.Mesh>(null);
    const [state] = useState(() => ({
        speed: 0.02 + Math.random() * 0.02,
        offset: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.3
    }));
    
    useFrame((clock) => {
        if (ref.current) {
            const t = clock.clock.getElapsedTime();
            const angle = t * state.speed * 10 + state.offset;
            ref.current.position.x = Math.cos(angle) * state.radius;
            ref.current.position.y = Math.sin(angle * 2) * 0.2;
            ref.current.position.z = Math.sin(angle) * state.radius;
            
            const scale = 0.5 + Math.sin(t * 5 + state.offset) * 0.5;
            ref.current.scale.setScalar(scale);
        }
    });

    return (
        <mesh ref={ref} frustumCulled={false}>
            <sphereGeometry args={[0.03]} />
            <meshBasicMaterial color={parentColor} transparent opacity={0.6} />
        </mesh>
    );
};