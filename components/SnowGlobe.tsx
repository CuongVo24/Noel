import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SNOW_GLOBE_RADIUS } from '../constants';
import { getSnowHeight } from '../utils/snowMath';

// Shared material props for consistent look between floor and bowl
const SNOW_MATERIAL_PROPS = {
  color: "#ffffff",
  roughness: 0.9,
  metalness: 0.1,
  clearcoat: 0.2,
  clearcoatRoughness: 0.4
};

// --- PROCEDURAL RUGGED SNOW FLOOR ---
const RuggedSnowFloor = () => {
  const geometry = useMemo(() => {
    // High-res plane for terrain surface
    const size = 25; 
    const resolution = 128;
    const geo = new THREE.PlaneGeometry(size, size, resolution, resolution);
    const posAttribute = geo.attributes.position;
    
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i); // This is Z in world space (Plane is rotated)
      const r = Math.sqrt(x * x + y * y);
      
      // 1. HARD CLIP: Drop vertices outside the globe glass
      if (r > SNOW_GLOBE_RADIUS - 0.1) {
          posAttribute.setZ(i, -10); 
          continue;
      }

      // 2. CALCULATE HEIGHT (Using Shared Math)
      let h = getSnowHeight(x, y);

      // 3. VISUAL GRAIN (Visual only, not affecting physics)
      // Adds subtle surface texture
      if (r > 4.5) { // Only add grain outside safe zone
          h += (Math.random() - 0.5) * 0.05;
      }

      posAttribute.setZ(i, h);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
        {/* Top Surface (The Terrain) */}
        <mesh 
            geometry={geometry} 
            rotation={[-Math.PI / 2, 0, 0]} 
            receiveShadow
        >
            <meshPhysicalMaterial {...SNOW_MATERIAL_PROPS} />
        </mesh>

        {/* Bottom Bowl Fill (The Volume) 
            Creates the solid look of snow filling the bottom hemisphere.
        */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
             <sphereGeometry args={[SNOW_GLOBE_RADIUS - 0.2, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
             <meshPhysicalMaterial {...SNOW_MATERIAL_PROPS} side={THREE.FrontSide} />
        </mesh>
    </group>
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
      {/* Background Stars Removed: Handled by SolarSystem.tsx */}

      {/* The Glass Sphere */}
      <mesh ref={glassRef} receiveShadow>
        <sphereGeometry args={[SNOW_GLOBE_RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          transmission={1.0} 
          opacity={0.15}
          metalness={0.0}
          roughness={0.0} 
          ior={1.0} 
          thickness={0} 
          reflectivity={0.02} 
          clearcoat={0}
          color="#eefeff" 
          side={THREE.FrontSide} 
          transparent
          envMapIntensity={1.0}
        />
      </mesh>

      {/* RUGGED SNOW SYSTEM */}
      <RuggedSnowFloor />

      {/* Reflective Ice Patches 
          Placed at y = -0.2.
          This will peek through in deep valleys of the noise logic.
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <circleGeometry args={[SNOW_GLOBE_RADIUS - 1.5, 64]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={5} 
          mixStrength={15} 
          roughness={0.5}
          depthScale={0}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#e0f7fa"
          metalness={0.2}
          mirror={0.2} 
          transparent
          opacity={0.5}
        />
      </mesh>

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
