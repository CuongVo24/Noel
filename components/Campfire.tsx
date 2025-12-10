import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { audioManager } from '../utils/audio';

interface CampfireProps {
  position: [number, number, number];
  flareTrigger?: number;
}

// Helper to manage a single dynamic flare light
const FlareLight = ({ active, startTime, offset }: { active: boolean, startTime: number, offset: [number, number, number] }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    
    useFrame((state) => {
        if (!active || !lightRef.current) return;
        const now = state.clock.getElapsedTime();
        const age = now - startTime;
        
        if (age < 2.0) {
            // Move up
            lightRef.current.position.y = 0.5 + (age * 1.5); // Rise speed
            // Intensity Curve: Burst then fade
            const intensity = Math.max(0, 5 * (1 - (age / 2))); 
            lightRef.current.intensity = intensity;
        } else {
            lightRef.current.intensity = 0;
        }
    });

    if (!active) return null;

    return (
        <pointLight 
            ref={lightRef}
            position={[offset[0], 0.5, offset[2]]}
            color="#ffaa00"
            distance={8}
            decay={2}
            castShadow
        />
    );
};

export const Campfire: React.FC<CampfireProps> = ({ position, flareTrigger = 0 }) => {
  const fireGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const lastTriggerRef = useRef(0);
  
  const [flaring, setFlaring] = useState(false);
  // Track start time for lights
  const [flareStartTime, setFlareStartTime] = useState(0);

  // Enhanced Particle System Data
  const particleCount = 150; 
  const [initialData] = useState(() => {
      const pos = new Float32Array(particleCount * 3);
      const vel = new Float32Array(particleCount * 3); 
      const colors = new Float32Array(particleCount * 3);
      const lifetimes = new Float32Array(particleCount); 
      const ages = new Float32Array(particleCount); 
      
      return { pos, vel, colors, lifetimes, ages };
  });

  const triggerFlare = useCallback(() => {
      setFlaring(true);
      setFlareStartTime(Date.now()); // Using Date.now for simpler state toggle, handled in hook via clock
      audioManager.playFireWhoosh();

      if (particlesRef.current) {
          const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
          
          for (let i = 0; i < particleCount; i++) {
              initialData.ages[i] = 0;
              initialData.lifetimes[i] = 2.0 + Math.random() * 1.0;

              // Tighter emitter at base
              positions[i * 3] = (Math.random() - 0.5) * 0.2;
              positions[i * 3 + 1] = 0.1 + Math.random() * 0.1;
              positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
              
              // Higher Velocity
              initialData.vel[i * 3] = (Math.random() - 0.5) * 0.2; 
              initialData.vel[i * 3 + 1] = 0.5 + Math.random() * 0.5; // Fast upward burst
              initialData.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
          }
      }
  }, [initialData, particleCount]);

  useEffect(() => {
    if (flareTrigger > lastTriggerRef.current) {
        lastTriggerRef.current = flareTrigger;
        triggerFlare();
    }
  }, [flareTrigger, triggerFlare]);

  // Hook to get THREE clock time for the lights
  const [simTime, setSimTime] = useState(0);
  useFrame((state) => {
      setSimTime(state.clock.getElapsedTime());
  });

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Base Fire Animation
    if (fireGroupRef.current) {
      fireGroupRef.current.children.forEach((child, i) => {
         child.scale.y = 1 + Math.sin(time * 6 + i * 2) * 0.3;
         child.rotation.z = Math.sin(time * 3 + i) * 0.1;
      });
    }

    if (flaring) {
        let activeParticles = 0;
        
        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            const currentColors = particlesRef.current.geometry.attributes.color.array as Float32Array;
            
            const gravity = 0.1; 
            const drag = 0.96;
            const windX = 0.2;

            for (let i = 0; i < particleCount; i++) {
                if (initialData.ages[i] < initialData.lifetimes[i]) {
                    activeParticles++;
                    initialData.ages[i] += delta;
                    
                    const lifeRatio = initialData.ages[i] / initialData.lifetimes[i];

                    initialData.vel[i * 3] += (windX * delta * 0.5);
                    initialData.vel[i * 3 + 1] -= gravity * delta;
                    
                    initialData.vel[i * 3] *= drag;
                    initialData.vel[i * 3 + 1] *= drag;
                    initialData.vel[i * 3 + 2] *= drag;

                    positions[i * 3] += initialData.vel[i * 3] * delta * 60; 
                    positions[i * 3 + 1] += initialData.vel[i * 3 + 1] * delta * 60;
                    positions[i * 3 + 2] += initialData.vel[i * 3 + 2] * delta * 60;

                    // Super Bright Colors (HDR)
                    // We multiply RGB by high values > 1.0 to work with Bloom
                    let r, g, b;
                    
                    if (lifeRatio < 0.2) {
                        // White Hot Core
                        r = 10.0;
                        g = 8.0;
                        b = 5.0;
                    } else if (lifeRatio < 0.5) {
                        // Fire Orange
                        r = 5.0;
                        g = 2.0;
                        b = 0.1;
                    } else {
                        // Fade out
                        const fade = 1.0 - ((lifeRatio - 0.5) * 2); 
                        r = 2.0 * fade;
                        g = 0.5 * fade;
                        b = 0.0;
                    }
                    
                    currentColors[i * 3] = r;
                    currentColors[i * 3 + 1] = g;
                    currentColors[i * 3 + 2] = b;

                    if (positions[i * 3 + 1] < 0) {
                        positions[i * 3 + 1] = 0;
                        initialData.ages[i] = initialData.lifetimes[i];
                    }
                } else {
                    currentColors[i * 3] = 0;
                    currentColors[i * 3 + 1] = 0;
                    currentColors[i * 3 + 2] = 0;
                    positions[i * 3 + 1] = -1;
                }
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
            particlesRef.current.geometry.attributes.color.needsUpdate = true;
        }

        if (activeParticles === 0) {
            setFlaring(false);
        }
    } else {
        if (particlesRef.current) {
             const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
             for(let i=0; i<particleCount; i++) positions[i*3+1] = -1;
             particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    }
  });

  const handleClick = (e: any) => {
      e.stopPropagation();
      triggerFlare();
  };

  return (
    <group position={position} onClick={handleClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
      {/* Wood Logs */}
      <group>
         <mesh position={[0, 0.05, 0.2]} rotation={[0.2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.6]} />
            <meshStandardMaterial color="#3e2723" />
         </mesh>
         <mesh position={[0.2, 0.05, -0.1]} rotation={[0.2, 2.1, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.6]} />
            <meshStandardMaterial color="#3e2723" />
         </mesh>
         <mesh position={[-0.2, 0.05, -0.1]} rotation={[0.2, -2.1, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.6]} />
            <meshStandardMaterial color="#3e2723" />
         </mesh>
      </group>

      {/* Dynamic Rising Lights */}
      {flaring && (
        <>
            <FlareLight active={flaring} startTime={simTime} offset={[0.2, 0, 0]} />
            <FlareLight active={flaring} startTime={simTime} offset={[-0.2, 0, 0.2]} />
            <FlareLight active={flaring} startTime={simTime} offset={[0, 0, -0.2]} />
        </>
      )}

      {/* Fire Geometry (Base Idle Fire) */}
      <group ref={fireGroupRef} position={[0, 0.1, 0]}>
         <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.2, 0.5, 5]} />
            <meshBasicMaterial color="#ff5722" toneMapped={false} />
         </mesh>
         <mesh position={[0.1, 0.15, 0.05]} rotation={[0, 1, -0.1]}>
             <coneGeometry args={[0.12, 0.4, 5]} />
            <meshBasicMaterial color="#ff9800" toneMapped={false} />
         </mesh>
      </group>

      {/* Flare Particles */}
      <points ref={particlesRef}>
         <bufferGeometry>
            <bufferAttribute 
                attach="attributes-position"
                count={particleCount}
                array={initialData.pos}
                itemSize={3}
            />
            <bufferAttribute 
                attach="attributes-color"
                count={particleCount}
                array={initialData.colors}
                itemSize={3}
            />
         </bufferGeometry>
         <pointsMaterial 
            size={0.6}
            vertexColors
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false} // CRITICAL for bloom
         />
      </points>

      {/* Static Warm Light for base fire */}
      <pointLight color="#ff6f00" intensity={1.5} distance={6} decay={2} castShadow />
    </group>
  );
};