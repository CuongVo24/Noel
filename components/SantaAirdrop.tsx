import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { audioManager } from '../utils/audio';

interface SantaAirdropProps {
  isActive: boolean;
  onComplete: () => void;
  onExplode: () => void; // Trigger to spawn items
}

export const SantaAirdrop: React.FC<SantaAirdropProps> = ({ isActive, onComplete, onExplode }) => {
  const boxRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const [phase, setPhase] = useState<'IDLE' | 'APPROACH' | 'DROP' | 'IMPACT'>('IDLE');
  const [timer, setTimer] = useState(0);

  // Random Y rotation fixed for this instance
  const [staticRotation] = useState(() => Math.random() * Math.PI * 2);

  // Scaled down dimensions (approx 30-40% smaller than previous 2.0 size)
  const BOX_SIZE = 1.4;
  const HALF_SIZE = BOX_SIZE / 2; // 0.7

  useEffect(() => {
    if (isActive && phase === 'IDLE') {
        setPhase('APPROACH');
        audioManager.playSleighBells();
        setTimer(0);
    }
  }, [isActive, phase]);

  useFrame((state, delta) => {
    if (phase === 'IDLE') return;

    setTimer(prev => prev + delta);

    if (phase === 'APPROACH') {
        // Shadow moves across ground
        if (shadowRef.current) {
            shadowRef.current.position.x = THREE.MathUtils.lerp(-10, 0, timer / 3);
            const material = shadowRef.current.material as THREE.MeshBasicMaterial;
            if (material) {
                material.opacity = Math.min(0.5, timer * 0.2);
            }
        }
        if (timer > 3) {
            setPhase('DROP');
            setTimer(0);
        }
    } else if (phase === 'DROP') {
        // Box falls from sky
        if (boxRef.current) {
            // Start at Y=20, land at Y=HALF_SIZE (0.7)
            const progress = Math.min(1, timer * 1.5); // Fall speed
            const eased = progress * progress; // Quadratic ease in
            
            const startY = 20;
            const endY = HALF_SIZE;
            
            boxRef.current.position.y = startY - eased * (startY - endY);
            
            // STATIC ROTATION: Force the fixed random rotation every frame to prevent any physics/jitter override
            boxRef.current.rotation.set(0, staticRotation, 0);

            // Impact Logic
            if (boxRef.current.position.y <= endY + 0.05) { // Small threshold
                audioManager.playThud();
                setPhase('IMPACT');
                setTimer(0);
                
                // SNAP TO FINAL POSITION
                boxRef.current.position.y = endY;
                boxRef.current.rotation.set(0, staticRotation, 0);
            }
        }
    } else if (phase === 'IMPACT') {
        // STATIC: Perfectly still. No wobble, no physics, no movement.
        if (boxRef.current) {
             boxRef.current.rotation.set(0, staticRotation, 0);
             boxRef.current.position.y = HALF_SIZE;
        }
        
        // Explode after 1 second
        if (timer > 1.0) {
            onExplode(); // Spawn items
            onComplete(); // Reset parent state
            setPhase('IDLE');
        }
    }
  });

  if (phase === 'IDLE') return null;

  return (
    <group>
        {/* Giant Gift Box */}
        {phase !== 'APPROACH' && (
            <group ref={boxRef} position={[0, 20, 0]}>
                {/* Main Box Body */}
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
                    <meshStandardMaterial color="#d32f2f" roughness={0.2} />
                </mesh>
                
                {/* Ribbons */}
                <mesh position={[0, 0, 0]}>
                     <boxGeometry args={[BOX_SIZE + 0.05, BOX_SIZE + 0.05, BOX_SIZE * 0.2]} />
                     <meshStandardMaterial color="#ffd700" metalness={0.8} />
                </mesh>
                <mesh position={[0, 0, 0]}>
                     <boxGeometry args={[BOX_SIZE * 0.2, BOX_SIZE + 0.05, BOX_SIZE + 0.05]} />
                     <meshStandardMaterial color="#ffd700" metalness={0.8} />
                </mesh>

                {/* SNOW BLANKET - Flattened Pyramid Trick */}
                {/* Positioned at top (0.7) + half height (0.1) = 0.8 */}
                {/* Scaled for BOX_SIZE 1.4: Radius ~ 1.1 Bottom, 0.8 Top */}
                <mesh position={[0, HALF_SIZE + 0.1, 0]} rotation={[0, Math.PI / 4, 0]}>
                     <cylinderGeometry args={[0.8, 1.1, 0.2, 4]} />
                     <meshStandardMaterial 
                        color="#ffffff" 
                        roughness={1.0} 
                        metalness={0.0}
                     />
                </mesh>
            </group>
        )}

        {/* Approaching Shadow Plane */}
        <mesh 
            ref={shadowRef} 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[-10, 0.1, 0]}
        >
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial color="black" transparent opacity={0} />
        </mesh>
    </group>
  );
};