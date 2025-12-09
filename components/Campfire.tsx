import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { audioManager } from '../utils/audio';

interface CampfireProps {
  position: [number, number, number];
  flareTrigger?: number;
}

export const Campfire: React.FC<CampfireProps> = ({ position, flareTrigger = 0 }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const fireGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const lastTriggerRef = useRef(0);
  
  const [flaring, setFlaring] = useState(false);

  // Enhanced Particle System Data
  const particleCount = 150; 
  const [initialData] = useState(() => {
      const pos = new Float32Array(particleCount * 3);
      const vel = new Float32Array(particleCount * 3); 
      const colors = new Float32Array(particleCount * 3);
      const lifetimes = new Float32Array(particleCount); // Total life of particle
      const ages = new Float32Array(particleCount); // Current age
      
      return { pos, vel, colors, lifetimes, ages };
  });

  const triggerFlare = useCallback(() => {
      setFlaring(true);
      audioManager.playFireWhoosh();

      if (particlesRef.current) {
          const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
          
          for (let i = 0; i < particleCount; i++) {
              // Reset Age
              initialData.ages[i] = 0;
              // Random Lifetime: 2.0 to 3.0 seconds
              initialData.lifetimes[i] = 2.0 + Math.random() * 1.0;

              // Start at base
              positions[i * 3] = (Math.random() - 0.5) * 0.3;
              positions[i * 3 + 1] = 0.2 + Math.random() * 0.2;
              positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
              
              // Explosion Velocity
              initialData.vel[i * 3] = (Math.random() - 0.5) * 0.1; 
              initialData.vel[i * 3 + 1] = 0.2 + Math.random() * 0.3; // Upward burst
              initialData.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
          }
      }
  }, [initialData, particleCount]);

  // Listen for global trigger updates
  useEffect(() => {
    if (flareTrigger > lastTriggerRef.current) {
        lastTriggerRef.current = flareTrigger;
        triggerFlare();
    }
  }, [flareTrigger, triggerFlare]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Base Fire Animation (Logs/Cones)
    if (fireGroupRef.current) {
      fireGroupRef.current.children.forEach((child, i) => {
         child.scale.y = 1 + Math.sin(time * 6 + i * 2) * 0.3;
         child.rotation.z = Math.sin(time * 3 + i) * 0.1;
      });
    }

    // Flare Logic
    if (flaring) {
        let activeParticles = 0;
        
        // Dynamic Light Pulse (based on average activity, roughly first 0.5s)
        if (lightRef.current) {
            // Intensity peaks early then fades
            const intensity = activeParticles > 0 ? 2 : 1.5 + Math.sin(time * 10) * 0.5;
            lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, intensity, 0.1);
        }

        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            const currentColors = particlesRef.current.geometry.attributes.color.array as Float32Array;
            
            // Physics Constants
            const gravity = 0.05; 
            const drag = 0.95;
            const windX = 0.15; // Wind blowing to the right

            for (let i = 0; i < particleCount; i++) {
                if (initialData.ages[i] < initialData.lifetimes[i]) {
                    activeParticles++;
                    initialData.ages[i] += delta;
                    
                    const lifeRatio = initialData.ages[i] / initialData.lifetimes[i]; // 0 to 1

                    // Update Velocity
                    initialData.vel[i * 3] += (windX * delta * 0.5); // Add wind force gradually
                    initialData.vel[i * 3 + 1] -= gravity * delta; // Gravity
                    
                    // Apply Drag
                    initialData.vel[i * 3] *= drag;
                    initialData.vel[i * 3 + 1] *= drag;
                    initialData.vel[i * 3 + 2] *= drag;

                    // Update Position
                    positions[i * 3] += initialData.vel[i * 3] * delta * 60; 
                    positions[i * 3 + 1] += initialData.vel[i * 3 + 1] * delta * 60;
                    positions[i * 3 + 2] += initialData.vel[i * 3 + 2] * delta * 60;

                    // Color & Opacity Logic
                    // Start: White/Orange (Fire) -> End: Dark (Smoke) -> Invisible
                    
                    let r, g, b;
                    
                    if (lifeRatio < 0.2) {
                        // Fire Phase
                        r = 1.0;
                        g = 0.5 + Math.random() * 0.5;
                        b = 0.2;
                    } else {
                        // Smoke Phase (Drift & Fade)
                        const smokeProgress = (lifeRatio - 0.2) / 0.8; // 0 to 1
                        const fade = 1.0 - smokeProgress; // 1 to 0
                        
                        // Fade from Orange to Greyish to Black/Invisible
                        r = 1.0 * fade;
                        g = 0.5 * fade;
                        b = 0.1 * fade;
                    }
                    
                    currentColors[i * 3] = r;
                    currentColors[i * 3 + 1] = g;
                    currentColors[i * 3 + 2] = b;

                    // Floor Collision
                    if (positions[i * 3 + 1] < 0) {
                        positions[i * 3 + 1] = 0;
                        initialData.ages[i] = initialData.lifetimes[i]; // Kill
                    }
                } else {
                    // Dead particle
                    currentColors[i * 3] = 0;
                    currentColors[i * 3 + 1] = 0;
                    currentColors[i * 3 + 2] = 0;
                    positions[i * 3 + 1] = -1; // Hide
                }
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
            particlesRef.current.geometry.attributes.color.needsUpdate = true;
        }

        if (activeParticles === 0) {
            setFlaring(false);
        }
    } else {
        // Idle state: Ensure hidden
        if (particlesRef.current) {
             const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
             // Move all out of view
             for(let i=0; i<particleCount; i++) positions[i*3+1] = -1;
             particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
        if (lightRef.current) {
            lightRef.current.intensity = 1.5 + Math.sin(time * 10) * 0.5 + Math.cos(time * 23) * 0.5;
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

      {/* Small Rocks details */}
      <group>
          {[0, 1, 2, 3, 4].map(i => {
              const angle = (i / 5) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(angle) * 0.6, 0.05, Math.sin(angle) * 0.6]} rotation={[Math.random(), Math.random(), 0]}>
                    <dodecahedronGeometry args={[0.1, 0]} />
                    <meshStandardMaterial color="#5d4037" />
                </mesh>
              )
          })}
      </group>

      {/* Fire Geometry */}
      <group ref={fireGroupRef} position={[0, 0.1, 0]}>
         <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.2, 0.5, 5]} />
            <meshBasicMaterial color="#ff5722" />
         </mesh>
         <mesh position={[0.1, 0.15, 0.05]} rotation={[0, 1, -0.1]}>
             <coneGeometry args={[0.12, 0.4, 5]} />
            <meshBasicMaterial color="#ff9800" />
         </mesh>
          <mesh position={[-0.1, 0.15, -0.05]} rotation={[0, 2, 0.1]}>
             <coneGeometry args={[0.12, 0.4, 5]} />
            <meshBasicMaterial color="#ffeb3b" />
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
            size={0.4}
            vertexColors
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
         />
      </points>

      {/* Warm Light */}
      <pointLight ref={lightRef} color="#ff6f00" distance={6} decay={2} castShadow />
    </group>
  );
};