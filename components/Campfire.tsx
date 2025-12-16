import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { audioManager } from '../utils/audio';
import { useQuality } from '../hooks/useQuality';
import '../types';

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
            lightRef.current.position.y = 0.5 + (age * 1.5); 
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
        />
    );
};

export const Campfire: React.FC<CampfireProps> = ({ position, flareTrigger = 0 }) => {
  const quality = useQuality();
  const fireGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const mainLightRef = useRef<THREE.PointLight>(null); // Ref for main shimmering light
  const lastTriggerRef = useRef(0);
  
  const [flaring, setFlaring] = useState(false);
  const [flareStartTime, setFlareStartTime] = useState(0);

  // OPTIMIZATION: Particle Count Cap
  // Lowered slightly to prevent "explosion" feel while maintaining visual density
  const particleCount = quality.tier === 'HIGH' ? 60 : 25;

  // UseMemo for stable buffer initialization
  const initialData = useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const vel = new Float32Array(particleCount * 3); 
      const colors = new Float32Array(particleCount * 3);
      const lifetimes = new Float32Array(particleCount); 
      const ages = new Float32Array(particleCount); 
      
      // Initialize off-screen
      for(let i=0; i<particleCount*3; i++) pos[i] = -1000;

      return { pos, vel, colors, lifetimes, ages };
  }, [particleCount]);

  const triggerFlare = useCallback(() => {
      // Logic safety: If already flaring recently (within 500ms), ignore to prevent stacking
      const now = Date.now();
      if (flaring && (now - flareStartTime < 500)) return;

      setFlaring(true);
      setFlareStartTime(now);
      // Only play audio if not spamming too hard is handled by parent, but nice to be safe
      audioManager.playFireWhoosh();

      // Reset particles for the new flare
      if (particlesRef.current) {
          const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
          
          for (let i = 0; i < particleCount; i++) {
              initialData.ages[i] = 0;
              initialData.lifetimes[i] = 1.5 + Math.random() * 1.0;

              // Center emission
              positions[i * 3] = (Math.random() - 0.5) * 0.3;
              positions[i * 3 + 1] = 0.1 + Math.random() * 0.2;
              positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
              
              // Explosive Upward Velocity
              initialData.vel[i * 3] = (Math.random() - 0.5) * 3.0; 
              initialData.vel[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
              initialData.vel[i * 3 + 1] = 5.0 + Math.random() * 2.0; 
          }
      }
  }, [flaring, flareStartTime, initialData, particleCount]);

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

    // Idle animation for cones
    if (fireGroupRef.current) {
      const len = fireGroupRef.current.children.length;
      for (let i = 0; i < len; i++) {
         const child = fireGroupRef.current.children[i];
         child.scale.y = 1 + Math.sin(time * 6 + i * 2) * 0.3;
         child.rotation.z = Math.sin(time * 3 + i) * 0.1;
      }
    }

    // MAIN LIGHT SHIMMER (Magical & Bright)
    if (mainLightRef.current) {
        // High frequency jitter + slower pulse
        const shimmer = Math.sin(time * 25) * 0.5 + Math.random() * 0.5;
        const breath = Math.sin(time * 2) * 0.5;
        
        mainLightRef.current.intensity = 6.0 + shimmer + breath;
        mainLightRef.current.distance = 9.0 + breath;
    }

    if (flaring) {
        let activeParticles = 0;
        
        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            const currentColors = particlesRef.current.geometry.attributes.color.array as Float32Array;
            
            const gravity = 3.0;
            const drag = 0.96;
            const windX = 0.2;

            for (let i = 0; i < particleCount; i++) {
                if (initialData.ages[i] < initialData.lifetimes[i]) {
                    activeParticles++;
                    initialData.ages[i] += delta;
                    
                    const lifeRatio = initialData.ages[i] / initialData.lifetimes[i];

                    // Physics math without object allocation
                    initialData.vel[i * 3] += (windX * delta * 0.5);
                    initialData.vel[i * 3 + 1] -= gravity * delta;
                    
                    initialData.vel[i * 3] *= drag;
                    initialData.vel[i * 3 + 1] *= drag;
                    initialData.vel[i * 3 + 2] *= drag;

                    positions[i * 3] += initialData.vel[i * 3] * delta; 
                    positions[i * 3 + 1] += initialData.vel[i * 3 + 1] * delta;
                    positions[i * 3 + 2] += initialData.vel[i * 3 + 2] * delta;

                    // Color ramp
                    let r, g, b;
                    if (lifeRatio < 0.2) {
                        r = 20.0; g = 15.0; b = 10.0;
                    } else if (lifeRatio < 0.6) {
                        r = 10.0; g = 4.0; b = 0.5;
                    } else {
                        const fade = 1.0 - ((lifeRatio - 0.6) * 2.5); 
                        r = 5.0 * fade; g = 0.2 * fade; b = 0.0;
                    }
                    
                    currentColors[i * 3] = r;
                    currentColors[i * 3 + 1] = g;
                    currentColors[i * 3 + 2] = b;

                    // Ground collision
                    if (positions[i * 3 + 1] < 0) {
                        positions[i * 3 + 1] = 0;
                        initialData.ages[i] = initialData.lifetimes[i]; // Kill it
                    }
                } else {
                    // Hide dead particles
                    currentColors[i * 3] = 0;
                    currentColors[i * 3 + 1] = 0;
                    currentColors[i * 3 + 2] = 0;
                    positions[i * 3 + 1] = -1000;
                }
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
            particlesRef.current.geometry.attributes.color.needsUpdate = true;
        }

        if (activeParticles === 0) {
            setFlaring(false);
        }
    } else {
        // Cleanup check: Ensure all particles are moved offscreen if not flaring
        if (particlesRef.current) {
             const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
             // Check first particle as proxy
             if(positions[1] > -500) {
                 for(let i=0; i<particleCount; i++) positions[i*3+1] = -1000;
                 particlesRef.current.geometry.attributes.position.needsUpdate = true;
             }
        }
    }
  });

  const handleClick = (e: any) => {
      e.stopPropagation();
      triggerFlare();
  };

  return (
    <group position={position} onClick={handleClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
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

      {flaring && (
        <>
            <FlareLight active={flaring} startTime={simTime} offset={[0.2, 0, 0]} />
            <FlareLight active={flaring} startTime={simTime} offset={[-0.2, 0, 0.2]} />
            <FlareLight active={flaring} startTime={simTime} offset={[0, 0, -0.2]} />
        </>
      )}

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

      {/* 
         KEY ADDED HERE: Force re-mount of points if particleCount changes. 
         This prevents WebGL buffer mismatch errors when switching Quality tiers.
      */}
      <points key={particleCount} ref={particlesRef} frustumCulled={false} renderOrder={1}>
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
            toneMapped={false}
         />
      </points>
      
      {/* UPDATED MAIN LIGHT: Shimmering and Brighter */}
      <pointLight 
        ref={mainLightRef} 
        color="#ff6f00" 
        intensity={6.0} 
        distance={9} 
        decay={2} 
      />
    </group>
  );
};