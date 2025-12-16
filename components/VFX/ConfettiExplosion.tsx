import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConfettiExplosionProps {
  position: THREE.Vector3;
  color: string;
  onComplete: () => void;
}

export const ConfettiExplosion: React.FC<ConfettiExplosionProps> = ({ position, color, onComplete }) => {
  const group = useRef<THREE.Group>(null);
  
  // Initialize particles with random velocity and slight color variations
  const [particles] = useState(() => {
    return new Array(20).fill(0).map(() => ({
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 5, 
            (Math.random() - 0.5) * 5 + 2, // Upward bias for "pop"
            (Math.random() - 0.5) * 5
        ),
        rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        scale: Math.random() * 0.5 + 0.3,
        // Create a variation of the user's color
        color: new THREE.Color(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.3)
    }));
  });
  
  const [time, setTime] = useState(0);

  useFrame((state, delta) => {
      setTime(t => t + delta);
      
      // End lifecycle after 0.8 seconds
      if (time > 0.8) {
          onComplete();
          return;
      }
      
      if (group.current) {
          group.current.children.forEach((mesh, i) => {
              const p = particles[i];
              
              // Move particle
              mesh.position.addScaledVector(p.velocity, delta);
              
              // Gravity
              p.velocity.y -= 9.8 * delta; 
              
              // Air Resistance (Drag)
              p.velocity.multiplyScalar(0.95);
              
              // Spin
              mesh.rotation.x += p.rotation.x * delta * 5;
              mesh.rotation.y += p.rotation.y * delta * 5;
              
              // Scale Down (Shrink to zero)
              const lifeRatio = time / 0.8;
              const scale = p.scale * (1 - lifeRatio);
              mesh.scale.setScalar(Math.max(0, scale));
          });
      }
  });

  return (
    <group position={position} ref={group}>
        {particles.map((p, i) => (
            <mesh key={i}>
                <planeGeometry args={[0.08, 0.08]} />
                <meshBasicMaterial color={p.color} side={THREE.DoubleSide} transparent opacity={0.9} />
            </mesh>
        ))}
    </group>
  );
};