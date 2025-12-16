import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Decoration } from '../types';
import { DecorationMesh } from './DecorationMeshes';

interface TreeProps {
  snowAmount: number;
  onDecorateStart: (point: THREE.Vector3) => void;
  decorations: Decoration[];
  isLit: boolean;
  onStarClick: (position: THREE.Vector3) => void;
  superNovaTrigger?: number; 
}

// --- GEOMETRY-BASED SNOW CAP (Vertex Masking Strategy) ---
// Creates a thin, rugged dust of snow on the upper "shoulders" of the cone.
const TreeSnowCap = ({ args, scale, snowAmount }: { args: [number, number, number], scale: number, snowAmount: number }) => {
    // args: [radius, height, radialSegments]
    const geometry = useMemo(() => {
        const radius = args[0];
        const height = args[1];
        // Increase height segments (4th arg) to allow for vertical detail/masking
        const geo = new THREE.ConeGeometry(radius, height, args[2] * 2, 12, true);
        
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            // Normalized height (0 at bottom, 1 at top)
            // Cone center is 0. Bottom is -height/2. Top is height/2.
            const normalizedY = (vertex.y + height / 2) / height;

            // STRATEGY: 
            // 1. Bottom 50%: Push vertices INWARDS (scale < 1.0) so they hide inside the green foliage.
            // 2. Top 50%: Push vertices OUTWARDS (scale > 1.0) to form the snow layer.
            // 3. Noise: Apply jagged random noise to the top part for "sần sùi" texture.

            if (normalizedY < 0.5) {
                // HIDE: Shrink radius to 90% so it sits inside the green layer
                // This creates a hidden base for the snow cap.
                const shrinkFactor = 0.95;
                vertex.x *= shrinkFactor;
                vertex.z *= shrinkFactor;
            } else {
                // SHOW: The "Shoulder" area (Top half)
                // 1. Base thickness (very thin layer)
                let expansion = 1.02; 
                
                // 2. Rugged Noise (High frequency, low amplitude)
                // This gives the "dusting" look rather than a solid plastic cap.
                const roughness = (Math.random() - 0.5) * 0.08; 
                
                // 3. Taper the transition so it doesn't look like a hard shelf
                // Smoothly blend from inner (0.95) to outer (1.02) around the 0.5 mark
                const transitionSmoothness = THREE.MathUtils.smoothstep(normalizedY, 0.5, 0.6);
                
                const finalScale = THREE.MathUtils.lerp(0.95, expansion + roughness, transitionSmoothness);
                
                vertex.x *= finalScale;
                vertex.z *= finalScale;
                
                // Add tiny vertical noise for surface texture
                vertex.y += (Math.random() - 0.5) * 0.04;
            }

            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        geo.computeVertexNormals();
        return geo;
    }, [args]);

    if (snowAmount <= 0.1) return null;

    return (
        <mesh position={[0, 0, 0]} geometry={geometry} scale={scale}>
             <meshStandardMaterial 
                color="#ffffff" 
                roughness={1.0} // High roughness for dry snow
                metalness={0.0}
                // No clearcoat prevents the "plastic/wet" look
            />
        </mesh>
    );
};

const TreeLayer = ({ position, scale, snowAmount }: { position: [number, number, number], scale: number, snowAmount: number }) => {
  // Base Cone Args: Radius, Height, Segments
  const CONE_ARGS: [number, number, number] = [1.5, 2.5, 32];

  return (
    <group position={position} scale={scale}>
      {/* 1. Green Foliage Layer */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={CONE_ARGS} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>

      {/* 2. Thin Rugged Snow Patch */}
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
            starLightRef.current.intensity = THREE.MathUtils.lerp(20.0, baseIntensity, t);
            starLightRef.current.distance = THREE.MathUtils.lerp(150.0, baseDistance, t);
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
            const scale = THREE.MathUtils.lerp(50, 0, t);
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
    if (!e.face) return;

    if (groupRef.current) {
        const localPoint = groupRef.current.worldToLocal(e.point.clone());
        const normal = e.face.normal.clone().applyQuaternion(groupRef.current.quaternion);
        localPoint.add(normal.multiplyScalar(0.2));
        onDecorateStart(localPoint);
    }
  };

  const handleStarClick = (e: any) => {
      e.stopPropagation();
      onStarClick(e.object.getWorldPosition(new THREE.Vector3()));
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (groupRef.current) {
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
