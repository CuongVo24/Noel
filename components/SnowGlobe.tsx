import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SNOW_GLOBE_RADIUS } from '../constants';
import { ShootingStars } from './ShootingStars';

export const SnowGlobe: React.FC<{ isNight: boolean; shakeIntensity: number }> = ({ isNight, shakeIntensity }) => {
  const glassRef = useRef<THREE.Mesh>(null);
  const sparklesRef = useRef<THREE.Group>(null);

  // Rotate glass slightly for reflection dynamism and swirl snow
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (glassRef.current) {
        glassRef.current.rotation.y = time * 0.02;
    }
    
    // Gentle Swirl only - drastically reduced reaction to shake
    if (sparklesRef.current) {
        // Just a very subtle extra rotation if shaking, no chaotic swirling
        sparklesRef.current.rotation.y += 0.002 + (shakeIntensity * 0.01); 
        // Dampen the tilt
        sparklesRef.current.rotation.z = Math.sin(time * 2) * shakeIntensity * 0.05;
    }
  });

  return (
    <group>
      {/* Background Stars & Shooting Stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ShootingStars />

      {/* The Glass Sphere */}
      <mesh ref={glassRef} receiveShadow>
        <sphereGeometry args={[SNOW_GLOBE_RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          transmission={0.9} // High transmission for glass
          opacity={1}
          metalness={0.1}
          roughness={0.0} // Perfectly smooth
          reflectivity={0.5} // Clear reflections
          ior={1.5} // Index of refraction for glass
          thickness={0.1}
          clearcoat={1}
          clearcoatRoughness={0}
          color="#ffffff" // Neutral glass color
          side={THREE.DoubleSide}
          transparent
        />
      </mesh>

      {/* Snow Floor - Base Layer with more bumps */}
      <group position={[0, -0.05, 0]}>
         {/* Main Flat Floor */}
         <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[SNOW_GLOBE_RADIUS - 0.5, 64]} />
            <meshStandardMaterial 
                color="#ffffff" 
                roughness={1} 
                metalness={0}
            />
         </mesh>

         {/* Procedural Snow Mounds (Simple spheres buried in ground) */}
         {Array.from({ length: 15 }).map((_, i) => {
             const angle = Math.random() * Math.PI * 2;
             const r = 2 + Math.random() * 8;
             const x = Math.cos(angle) * r;
             const z = Math.sin(angle) * r;
             const scale = 1 + Math.random() * 2;
             return (
                 <mesh key={i} position={[x, -0.5, z]} scale={[scale, 0.5, scale]}>
                     <sphereGeometry args={[1, 16, 16]} />
                     <meshStandardMaterial color="#ffffff" roughness={1} />
                 </mesh>
             )
         })}
      </group>

      {/* Reflective Ice Patches on top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[SNOW_GLOBE_RADIUS - 1, 64]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={30}
          roughness={0.5}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#e0f7fa"
          metalness={0.2}
          mirror={0.5}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Falling Snow Particles - Gentle Configuration */}
      <group ref={sparklesRef}>
        <Sparkles 
            count={1500} // Fixed lower count for calm atmosphere
            scale={[SNOW_GLOBE_RADIUS * 1.8, SNOW_GLOBE_RADIUS, SNOW_GLOBE_RADIUS * 1.8]}
            size={4} // Smaller, softer particles
            speed={0.4} // Slow falling speed
            opacity={0.7}
            color="#ffffff"
            position={[0, SNOW_GLOBE_RADIUS/2, 0]}
        />
      </group>
    </group>
  );
};