import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SNOW_GLOBE_RADIUS } from '../constants';
import { getSnowHeight } from '../utils/snowMath';
import '../types';

// Shared material props for consistent look
const SNOW_MATERIAL_PROPS = {
  color: "#ffffff",
  roughness: 0.9,
  metalness: 0.1,
  clearcoat: 0.2,
  clearcoatRoughness: 0.4
};

// --- PROCEDURAL RUGGED SNOW FLOOR (Flattened Sphere Technique) ---
const RuggedSnowFloor = () => {
  const geometry = useMemo(() => {
    // 1. GEOMETRY SOURCE: SphereGeometry
    // Radius 11.8 (Slightly smaller than Glass 12.0 to prevent Z-fighting)
    // High segment count for detailed terrain noise
    const radius = 11.8;
    const geo = new THREE.SphereGeometry(radius, 128, 64);
    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();
    
    // The height at which the sphere is "sliced" to form the flat terrain
    // 0.0 aligns with the game's physics engine (snowMath)
    const SNOW_LEVEL = 0.0;

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);

      // 2. VERTEX MANIPULATION
      // If vertex is in the top hemisphere (above snow level), squash it down.
      // If vertex is in the bottom hemisphere, leave it alone (forms the bowl).
      if (vertex.y >= SNOW_LEVEL) {
          // Squash Y to the surface level
          vertex.y = SNOW_LEVEL;

          // 3. APPLY NOISE
          // Query the shared "Physics Engine" to get the terrain height at this X/Z
          // This ensures the mesh perfectly matches where objects sit.
          const terrainHeight = getSnowHeight(vertex.x, vertex.z);
          
          vertex.y += terrainHeight;
      }

      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh 
        geometry={geometry} 
        receiveShadow
        position={[0, 0, 0]}
    >
        <meshPhysicalMaterial {...SNOW_MATERIAL_PROPS} />
    </mesh>
  );
};

export const SnowGlobe: React.FC<{ isNight: boolean; shakeIntensity: number }> = ({ isNight, shakeIntensity }) => {
  const glassRef = useRef<THREE.Mesh>(null);
  const sparklesRef = useRef<THREE.Group>(null);

  // Rotate glass slightly for reflection dynamism and swirl snow
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (glassRef.current) {
        glassRef.current.rotation.y = time * 0.02;
    }
    
    if (sparklesRef.current) {
        sparklesRef.current.rotation.y += 0.002 + (shakeIntensity * 0.01); 
        sparklesRef.current.rotation.z = Math.sin(time * 2) * shakeIntensity * 0.05;
    }
  });

  return (
    <group>
      {/* The Glass Sphere */}
      <mesh ref={glassRef} receiveShadow>
        <sphereGeometry args={[SNOW_GLOBE_RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          transmission={1.0} 
          opacity={0.15}
          metalness={0.0}
          roughness={0.0} 
          ior={1.0}           // Air-like index of refraction
          thickness={0} 
          reflectivity={0}    // Disable reflections
          clearcoat={0}       // Remove shiny coating
          specularIntensity={0} // Remove specular highlights
          color="#eefeff" 
          side={THREE.FrontSide} 
          transparent
          envMapIntensity={0} // Disable environment map influence
        />
      </mesh>

      {/* RUGGED SNOW SYSTEM (Volumetric Fill) */}
      <RuggedSnowFloor />

      {/* Falling Snow Particles */}
      <group ref={sparklesRef}>
        <Sparkles 
            count={1500} 
            scale={[SNOW_GLOBE_RADIUS * 1.8, SNOW_GLOBE_RADIUS, SNOW_GLOBE_RADIUS * 1.8]}
            size={4}
            speed={0.4}
            opacity={0.7}
            color="#ffffff"
            position={[0, SNOW_GLOBE_RADIUS/2, 0]}
            frustumCulled={false}
        />
      </group>
    </group>
  );
};