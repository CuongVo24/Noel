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

// --- GEOMETRY-BASED SNOW CAP ---
// Creates a physical snow layer on top of the tree cone
const TreeSnowCap = ({ args, scale, snowAmount }: { args: [number, number, number], scale: number, snowAmount: number }) => {
    // args = [radius, height, segments]
    // We want the snow to only cover the top ~40-50% (shoulders) of the cone.
    
    // 1. Calculate dimensions for a "Cap" cone
    // If we cut the main cone at 50% height, the radius at that point is 50%.
    // We create a new cone that represents this top half.
    const originalHeight = args[1];
    const originalRadius = args[0];
    
    const capHeight = originalHeight * 0.55; // Slightly more than half to overlap well
    const capRadius = originalRadius * 0.55; // Match slope scale
    
    const geometry = useMemo(() => {
        // Create the smaller cap cone
        // Scale radius x1.15 to make it thick and sit "on top" rather than inside
        const geo = new THREE.ConeGeometry(capRadius * 1.15, capHeight, args[2] * 2);
        
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();
        
        // NOISE SEEDS
        const noiseFreq = 3.5;
        const dripFreq = 9.0;

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            const y = vertex.y; // Local Y. Center=0. Range: [-capHeight/2, capHeight/2]
            const angle = Math.atan2(vertex.z, vertex.x);

            // 1. General Lumpy Noise (Thickness)
            const lump = Math.sin(vertex.x * noiseFreq) * Math.cos(vertex.z * noiseFreq);
            // Push outward along normal (approximation: just radial push)
            const push = 0.08 + (lump * 0.03);

            vertex.x += vertex.x * push;
            vertex.z += vertex.z * push;

            // 2. Bottom Edge Dripping (Jaggedness)
            // Determine where the bottom of this cap is
            const bottomThreshold = -capHeight * 0.35;
            
            if (y < bottomThreshold) {
                // Create sine wave drips at the edge
                const drip = Math.sin(angle * dripFreq) * 0.12;
                const noise = Math.sin(angle * 25.0) * 0.04;
                
                // Pull vertices down to create the drip over the green
                vertex.y += (drip + noise);
            }

            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        geo.computeVertexNormals();
        return geo;
    }, [capRadius, capHeight, args]);

    if (snowAmount <= 0.1) return null;

    // POSITIONING:
    // Green Cone (Height H): Center @ 0. Top @ +H/2.
    // Cap Cone (Height h): Center @ 0. Top @ +h/2.
    // We want CapTop to match GreenTop.
    // OffsetY + h/2 = H/2  =>  OffsetY = (H - h) / 2
    const yOffset = (originalHeight - capHeight) / 2;

    return (
        <mesh position={[0, yOffset, 0]} geometry={geometry} scale={scale}>
             <meshPhysicalMaterial 
                color="#f8fafd" 
                roughness={0.7} 
                metalness={0.1}
                clearcoat={0.5}
                clearcoatRoughness={0.2}
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

      {/* 2. Physical Snow Cap Layer (Shoulders Only) */}
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
