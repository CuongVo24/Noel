import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Decoration, DecorationType } from '../types';
import { DecorationMesh } from './DecorationMeshes';

interface TreeProps {
  snowAmount: number;
  onDecorateStart: (point: THREE.Vector3, normal?: THREE.Vector3, type?: DecorationType) => void;
  decorations: Decoration[];
  isLit: boolean;
  onStarClick: (position: THREE.Vector3) => void;
  superNovaTrigger?: number; 
}

// --- GEOMETRY-BASED SNOW CAP ---
// Creates a rugged, jagged layer of snow that sits on top of the tree branches.
const TreeSnowCap = ({ args, scale, snowAmount }: { args: [number, number, number], scale: number, snowAmount: number }) => {
    // args: [radius, height, radialSegments]
    const geometry = useMemo(() => {
        const radius = args[0];
        const height = args[1];
        const radialSegments = 64; // High detail for rugged edges
        const heightSegments = 12; // Allows for surface undulation

        // Create base cone
        const geo = new THREE.ConeGeometry(radius, height, radialSegments, heightSegments, true); // Open ended to save polys
        
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();
        
        // Pseudo-random noise helper without external dependencies
        const getNoise = (x: number, z: number, freq: number) => {
            return Math.sin(x * freq) * Math.cos(z * freq);
        };

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            // 1. Calculate relative height (0.0 at bottom, 1.0 at top)
            // Cone center is 0. Bottom is -height/2. Top is height/2.
            const yNormalized = (vertex.y + height / 2) / height;

            // 2. EXPANSION: Push everything out slightly to sit ON TOP of the green layer
            // Taper expansion: thickest at bottom rim, thinnest at top tip
            const expansionBase = 1.04;
            
            // 3. RUGGEDNESS ("Sần sùi")
            // Apply noise to X/Z to make the surface uneven
            const angle = Math.atan2(vertex.z, vertex.x);
            const noise = getNoise(vertex.x, vertex.z, 5.0) * 0.05;
            const ruggedScale = expansionBase + noise;
            
            vertex.x *= ruggedScale;
            vertex.z *= ruggedScale;

            // 4. JAGGED BOTTOM EDGE (The "Drip" Look)
            // If we are at the bottom rim (low yNormalized), distort Y downwards
            if (yNormalized < 0.15) {
                // Create irregular drips using combined sine waves based on angle
                const dripNoise = Math.sin(angle * 9) + Math.cos(angle * 17) * 0.5;
                
                // Push vertices down where noise is high
                const dripStrength = Math.max(0, dripNoise) * 0.15; 
                vertex.y -= dripStrength;
                
                // Pull vertices in slightly at the drips so they hang naturally
                vertex.x *= 0.98;
                vertex.z *= 0.98;
            }

            // 5. TOP FLUFF
            // Add a little vertical noise to the surface
            vertex.y += getNoise(vertex.x * 2, vertex.z * 2, 10) * 0.02;

            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        geo.computeVertexNormals();
        return geo;
    }, [args]);

    // Opacity/Visibility based on snow amount
    if (snowAmount <= 0.1) return null;

    return (
        <mesh position={[0, 0, 0]} geometry={geometry} scale={scale}>
             <meshStandardMaterial 
                color="#ffffff" 
                roughness={1.0} // High roughness for dry, powdery snow
                metalness={0.0}
                flatShading={false}
            />
        </mesh>
    );
};

const TreeLayer = ({ position, scale, snowAmount }: { position: [number, number, number], scale: number, snowAmount: number }) => {
  // Base Cone Args: Radius, Height, Segments
  const CONE_ARGS: [number, number, number] = [1.8, 2.5, 32];

  return (
    <group position={position} scale={scale}>
      {/* 1. Green Foliage Layer */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={CONE_ARGS} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>

      {/* 2. Geometric Snow Cap */}
      <TreeSnowCap args={CONE_ARGS} scale={1.0} snowAmount={snowAmount} />
    </group>
  );
};

export const ChristmasTree: React.FC<TreeProps> = ({ snowAmount, onDecorateStart, decorations, isLit, onStarClick, superNovaTrigger = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const starLightRef = useRef<THREE.PointLight>(null);
  const flashSpriteRef = useRef<THREE.Sprite>(null);
  
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  // Generate a soft glow texture for the fake bloom sprite
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    return () => {
        glowTexture.dispose();
    };
  }, [glowTexture]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const now = Date.now();
    
    // Star Pulse Animation
    if (starRef.current && isLit) {
         starRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
    }

    // SUPER NOVA LIGHT LOGIC
    if (starLightRef.current) {
        const age = (now - superNovaTrigger) / 1000;
        const LIGHT_DURATION = 2.5;
        
        const baseIntensity = isLit ? 4.0 : 0.0;
        const baseDistance = isLit ? 15.0 : 0.0;
        const baseDecay = 2.0;

        if (superNovaTrigger > 0 && age < LIGHT_DURATION) {
            const t = age / LIGHT_DURATION;
            // BOOST: Intensity 80 (Blinding), Distance 300 (Whole Scene)
            starLightRef.current.intensity = THREE.MathUtils.lerp(80.0, baseIntensity, t);
            starLightRef.current.distance = THREE.MathUtils.lerp(300.0, baseDistance, t);
            starLightRef.current.decay = THREE.MathUtils.lerp(1.0, baseDecay, t);
        } else {
            starLightRef.current.intensity = baseIntensity;
            starLightRef.current.distance = baseDistance;
            starLightRef.current.decay = baseDecay;
        }
    }

    // SUPER NOVA SPRITE LOGIC
    if (flashSpriteRef.current) {
        const age = (now - superNovaTrigger) / 1000;
        const FLASH_DURATION = 0.5;

        if (superNovaTrigger > 0 && age < FLASH_DURATION) {
            const t = age / FLASH_DURATION;
            // BOOST: Scale 120 (Massive Shockwave)
            const scale = THREE.MathUtils.lerp(120, 0, t);
            const opacity = THREE.MathUtils.lerp(1, 0, t);
            
            flashSpriteRef.current.scale.setScalar(scale);
            flashSpriteRef.current.material.opacity = opacity;
            flashSpriteRef.current.visible = true;
        } else {
            flashSpriteRef.current.scale.setScalar(0);
            flashSpriteRef.current.material.opacity = 0;
            flashSpriteRef.current.visible = false;
        }
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    // Guard clause: Ensure intersection data exists
    if (!e.face || !e.face.normal || !e.object || !groupRef.current) return;

    try {
        // 1. Calculate Local Point
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        
        // 2. Calculate Local Normal
        const worldNormal = e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize();
        const localNormal = worldNormal.clone().transformDirection(groupRef.current.matrixWorld.clone().invert()).normalize();

        // 3. Apply Aggressive Offset to prevent clipping
        // INCREASED from 0.7 to 0.8 to account for the geometry-based snow cap thickness.
        // This ensures the pivot point of the decoration floats outside the snow surface.
        localPoint.add(localNormal.clone().multiplyScalar(0.8));
        
        onDecorateStart(localPoint, localNormal);
    } catch (err) {
        console.warn("Tree Interaction Error:", err);
    }
  };

  const handleStarClick = (e: any) => {
      e.stopPropagation();
      onStarClick(e.object.getWorldPosition(new THREE.Vector3()));
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (groupRef.current && e.point) {
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        setHoverPoint(localPoint);
    }
  };

  const handlePointerOut = () => {
    setHoverPoint(null);
  };

  return (
    <group ref={groupRef} scale={0.8}>
      
      {/* TREE TRUNK */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.35, 1.2, 8]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>

      <group 
        onClick={handlePointerDown} 
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        {/* Layered Cones with Geometry Snow */}
        <TreeLayer position={[0, 1.5, 0]} scale={1.2} snowAmount={snowAmount} />
        <TreeLayer position={[0, 2.5, 0]} scale={1.0} snowAmount={snowAmount} />
        <TreeLayer position={[0, 3.5, 0]} scale={0.8} snowAmount={snowAmount} />
      </group>

      {hoverPoint && (
        <mesh position={hoverPoint}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="white" opacity={0.5} transparent />
        </mesh>
      )}

      {decorations.map((dec) => (
        <DecorationMesh key={dec.id} data={dec} isLit={isLit} />
      ))}

      {/* Tree Topper - Interactive Star */}
      <mesh 
        ref={starRef} 
        position={[0, 4.8, 0]} 
        onClick={handleStarClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
         <octahedronGeometry args={[0.4, 0]} />
         <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FFD700"
            emissiveIntensity={isLit ? 10 : 0.5}
            toneMapped={false}
         />
      </mesh>
      
      {/* Star Lights */}
      <pointLight 
          ref={starLightRef}
          position={[0, 4.8, 0]} 
          intensity={0}
          distance={0}
          color="#FFD700" 
          decay={2} 
      />

      <sprite ref={flashSpriteRef} position={[0, 4.8, 0]} renderOrder={9999} frustumCulled={false}>
          <spriteMaterial 
            map={glowTexture} 
            transparent 
            opacity={0} 
            depthWrite={false} 
            depthTest={false} 
            blending={THREE.AdditiveBlending} 
          />
      </sprite>
      
      {isLit && (
        <pointLight position={[0, 2.5, 1]} distance={3} intensity={2} color="#ffaa00" decay={2} />
      )}
    </group>
  );
};