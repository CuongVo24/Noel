import React, { useState, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Gift } from '../types';
import { getSnowHeight } from '../utils/snowMath';

// Static mock gifts (Y position will be ignored and recalculated)
const STATIC_GIFTS_DATA: Gift[] = [
    { id: 'g1', position: [1.5, 0, 1.5], color: '#d32f2f', message: 'Giáng sinh an lành! Merry Christmas!', sender: 'Mom', opened: false },
    { id: 'g2', position: [-1.2, 0, 1], color: '#1976d2', message: 'Chúc bạn một mùa đông ấm áp bên gia đình.', sender: 'Dev', opened: false },
    { id: 'g3', position: [0.5, 0, -1.5], color: '#388e3c', message: 'Peace and Joy to the world.', sender: 'Santa', opened: false },
    { id: 'g4', position: [2.5, 0, 0.5], color: '#ffeb3b', message: 'Năm mới phát tài phát lộc!', sender: 'Friend', opened: false },
    { id: 'g5', position: [-2, 0, -2], color: '#9c27b0', message: 'Happy Holidays!', sender: 'Secret Santa', opened: false },
    { id: 'g6', position: [3, 0, -1], color: '#00bcd4', message: 'Chúc mừng giáng sinh!', sender: 'Bro', opened: false },
    { id: 'g7', position: [-3.5, 0, 1.5], color: '#ff5722', message: 'Mong mọi điều ước của bạn thành hiện thực.', sender: 'Sis', opened: false },
    { id: 'g8', position: [0, 0, 3], color: '#e91e63', message: 'Love and Happiness.', sender: 'Dad', opened: false },
    { id: 'g9', position: [-1.5, 0, 2.5], color: '#795548', message: 'Giáng sinh vui vẻ nhé!', sender: 'Neighbor', opened: false },
    { id: 'g10', position: [2, 0, 2.5], color: '#607d8b', message: 'Merry Xmas!', sender: 'Colleague', opened: false },
];

// --- 1. ORGANIC SNOW CAP (Thin Crust, No Bow) ---
const OrganicSnowCap = ({ size }: { size: number }) => {
  const geometry = useMemo(() => {
    // Plane covering the lid
    const geo = new THREE.PlaneGeometry(size, size, 32, 32);
    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < posAttribute.count; i++) {
        vertex.fromBufferAttribute(posAttribute, i);
        
        // Distance from center
        const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y); // Plane lies on XY before rotation
        const maxDist = size / 2;

        // Base Height: Very Thin (0.02)
        let h = 0.02;

        // RUGGED NOISE: High frequency, low amplitude
        h += (Math.random() - 0.5) * 0.015;

        // EDGE DROP-OFF:
        if (dist > maxDist * 0.95) {
             const t = (dist - maxDist * 0.95) / (maxDist * 0.05);
             h *= (1.0 - t); // Fade height to 0
        }

        // Clamp
        h = Math.max(0.002, h); 

        posAttribute.setZ(i, h); 
    }

    geo.computeVertexNormals();
    return geo;
  }, [size]);

  return (
    <mesh 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]} 
      // Embed slightly (-0.005) into the lid to prevent floating/gaps
      position={[0, -0.005, 0]} 
      castShadow 
      receiveShadow
    >
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={0.9} 
        metalness={0.1}
      />
    </mesh>
  );
};

// --- 2. GIFT BOX COMPONENT ---
interface GiftBoxProps {
  gift: Gift;
  onOpen: (msg: string) => void;
}

const HollowGiftBox: React.FC<GiftBoxProps> = ({ gift, onOpen }) => {
  const [active, setActive] = useState(false);
  
  const SIZE = 0.5;
  const WALL = 0.02; // Wall thickness
  const HALF = SIZE / 2;
  const LID_H = 0.04; // Lid Height

  const [rotation] = useState(() => [0, Math.random() * Math.PI, 0] as [number, number, number]);

  // BODY GEOMETRY (5 Sides)
  const bodyGeo = useMemo(() => {
    const geos = [];
    // Floor
    const floor = new THREE.BoxGeometry(SIZE, WALL, SIZE);
    floor.translate(0, -HALF + WALL/2, 0);
    geos.push(floor);
    // Walls (L, R, F, B)
    const w1 = new THREE.BoxGeometry(WALL, SIZE, SIZE);
    w1.translate(-HALF + WALL/2, 0, 0);
    geos.push(w1);
    const w2 = new THREE.BoxGeometry(WALL, SIZE, SIZE);
    w2.translate(HALF - WALL/2, 0, 0);
    geos.push(w2);
    const w3 = new THREE.BoxGeometry(SIZE - 2*WALL, SIZE, WALL);
    w3.translate(0, 0, HALF - WALL/2);
    geos.push(w3);
    const w4 = new THREE.BoxGeometry(SIZE - 2*WALL, SIZE, WALL);
    w4.translate(0, 0, -HALF + WALL/2);
    geos.push(w4);

    const merged = mergeGeometries(geos);
    geos.forEach(g => g.dispose());
    return merged;
  }, [SIZE, WALL, HALF]);

  // LID RIM GEOMETRY (4 Sides ONLY, NO Top Face)
  const lidRimGeo = useMemo(() => {
    const geos = [];
    // Front Rim
    const f = new THREE.BoxGeometry(SIZE, LID_H, WALL);
    f.translate(0, 0, SIZE/2 - WALL/2);
    geos.push(f);
    // Back Rim
    const b = new THREE.BoxGeometry(SIZE, LID_H, WALL);
    b.translate(0, 0, -SIZE/2 + WALL/2);
    geos.push(b);
    // Left Rim
    const l = new THREE.BoxGeometry(WALL, LID_H, SIZE - 2*WALL);
    l.translate(-SIZE/2 + WALL/2, 0, 0);
    geos.push(l);
    // Right Rim
    const r = new THREE.BoxGeometry(WALL, LID_H, SIZE - 2*WALL);
    r.translate(SIZE/2 - WALL/2, 0, 0);
    geos.push(r);

    const merged = mergeGeometries(geos);
    geos.forEach(g => g.dispose());
    return merged;
  }, [SIZE, LID_H, WALL]);

  const { lidRot } = useSpring({
    lidRot: active ? -Math.PI / 1.5 : 0, 
    config: { tension: 200, friction: 20 }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setActive(!active);
    if (!active) onOpen(gift.message);
  };

  const boxMat = new THREE.MeshStandardMaterial({
      color: gift.color,
      roughness: 0.6,
  });

  return (
    <group position={gift.position} rotation={rotation} onClick={handleClick}>
      
      {/* 1. Main Box Body */}
      <group position={[0, HALF, 0]}>
         <mesh geometry={bodyGeo} material={boxMat} castShadow receiveShadow />
         
         {/* Ribbons as BoxGeometry - Solid with thickness to avoid glitches */}
         <mesh position={[0, 0, HALF + 0.005]}>
             <boxGeometry args={[0.08, SIZE, 0.015]} /> 
             <meshStandardMaterial color="#FFF" />
         </mesh>
         <mesh position={[0, 0, -HALF - 0.005]}>
             <boxGeometry args={[0.08, SIZE, 0.015]} />
             <meshStandardMaterial color="#FFF" />
         </mesh>
      </group>

      {/* 2. Animated Lid Group */}
      {/* Pivot point at the top-back edge of the box */}
      {/* @ts-ignore */}
      <animated.group position={[0, SIZE, -HALF]} rotation-x={lidRot}>
          {/* Shift back to center relative to pivot */}
          <group position={[0, 0, HALF]}>
             
             {/* A. The Lid Rim (Cardboard) */}
             <mesh position={[0, LID_H/2, 0]} geometry={lidRimGeo} material={boxMat} castShadow receiveShadow />

             {/* B. The Snow Cap - Embedded into lid, NO BOW */}
             <group position={[0, LID_H * 0.4, 0]}>
                 <OrganicSnowCap size={SIZE} />
             </group>

          </group>
      </animated.group>

      {/* Shadow Decal on Floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <planeGeometry args={[SIZE * 1.4, SIZE * 1.4]} />
         <meshBasicMaterial color="#000000" opacity={0.3} transparent depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Gifts: React.FC<{ onOpen: (msg: string) => void }> = ({ onOpen }) => {
    
    // Apply Gravity: Calculate Y for all gifts based on their X/Z position
    const gravityGifts = useMemo(() => {
        return STATIC_GIFTS_DATA.map(g => ({
            ...g,
            position: [
                g.position[0],
                getSnowHeight(g.position[0], g.position[2]),
                g.position[2]
            ] as [number, number, number]
        }));
    }, []);

    return (
        <group>
            {gravityGifts.map(g => <HollowGiftBox key={g.id} gift={g} onOpen={onOpen} />)}
        </group>
    );
};
