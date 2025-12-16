import React, { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Gift } from '../types';
import { getSnowHeight } from '../utils/snowMath';

// Static mock gifts with Gen Z Vietnamese Slang
const STATIC_GIFTS_DATA: Gift[] = [
    { id: 'g1', position: [1.5, 0, 1.5], color: '#d32f2f', message: 'Noel này tuy lạnh nhưng không bằng trái tim crush lạnh lùng với tui 🥶. Chúc bạn sớm thoát kiếp F.A!', sender: 'Hội Người Cũ', opened: false },
    { id: 'g2', position: [-1.2, 0, 1], color: '#1976d2', message: 'Chúc đằng ấy Giáng Sinh slay ngất ngây, tiền về đầy túi, tình đầy tim! 10 điểm không có nhưng! 💅✨', sender: 'Bestie', opened: false },
    { id: 'g3', position: [0.5, 0, -1.5], color: '#388e3c', message: 'Cầu mong năm mới không deadline, chỉ có headline là "Trúng số độc đắc" 🤑. Gét gô!', sender: 'Vũ trụ', opened: false },
    { id: 'g4', position: [2.5, 0, 0.5], color: '#ffeb3b', message: 'Flex nhẹ cái giáng sinh ấm áp. Chúc bạn visual thăng hạng, tài khoản thêm nhiều số 0! 👌', sender: 'Fan cứng', opened: false },
    { id: 'g5', position: [-2, 0, -2], color: '#9c27b0', message: 'Noel vui vẻ không quạu, lì xì ting ting là hết sầu! Mãi keo lì tái châu nha! 🥂', sender: 'Hội chị em', opened: false },
    { id: 'g6', position: [3, 0, -1], color: '#00bcd4', message: 'Đừng để Noel này giống Noel xưa, vẫn đi xe máy, vẫn chưa có bồ... à mà thôi chúc vui là chính! 🤣', sender: 'Người lạ', opened: false },
    { id: 'g7', position: [-3.5, 0, 1.5], color: '#ff5722', message: 'Chúc bạn sang năm mới công việc "trôi" như người yêu cũ, tiền vào như nước sông Đà! 🌊', sender: 'Đồng nghiệp', opened: false },
    { id: 'g8', position: [0, 0, 3], color: '#e91e63', message: 'Giáng sinh này, chúc bạn tìm được "chân ái" chứ không phải "chân gà" nha 🍗❤️. Yêu thương!', sender: 'Secret Santa', opened: false },
    { id: 'g9', position: [-1.5, 0, 2.5], color: '#795548', message: 'Hết nước chấm! Chúc mừng Giáng Sinh! Ai có đôi thì hạnh phúc, ai cô đơn thì... rủ tui đi nhậu! 🍻', sender: 'Bợm nhậu', opened: false },
    { id: 'g10', position: [2, 0, 2.5], color: '#607d8b', message: 'Tầm này thì còn liêm sỉ gì nữa, chúc bạn mau giàu ú ụ để bao tui đi ăn! Chốt đơn! 🔨', sender: 'Đứa bạn thân', opened: false },
];

// --- 1. ORGANIC SNOW CAP (Soft Pillow Style) ---
const OrganicSnowCap = ({ size }: { size: number }) => {
  const geometry = useMemo(() => {
    // High resolution plane for smooth curvature
    const geo = new THREE.PlaneGeometry(size, size, 64, 64);
    const posAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();
    
    // Config
    const maxDist = size / 2;
    const padding = 0.05; // Distance from edge where tapering starts

    for (let i = 0; i < posAttribute.count; i++) {
        vertex.fromBufferAttribute(posAttribute, i);
        
        // Distance from center
        const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);
        
        // 1. Base Height & Noise
        const baseHeight = 0.025; 
        const noise = (Math.random() - 0.5) * 0.008; // Subtle surface texture

        // 2. Soft Pillow Taper (Smoothstep)
        // Returns 1.0 at center, drops to 0.0 as it reaches the edge
        // smoothstep(edge, start, current)
        const taperFactor = THREE.MathUtils.smoothstep(maxDist, maxDist - padding, dist);

        // Apply Taper
        // This ensures edges adhere to the box, avoiding the "blocky" look
        let h = (baseHeight + noise) * taperFactor;
        
        // Ensure strictly non-negative
        h = Math.max(0, h);

        posAttribute.setZ(i, h); 
    }

    geo.computeVertexNormals();
    return geo;
  }, [size]);

  return (
    <mesh 
      geometry={geometry} 
      rotation={[-Math.PI / 2, 0, 0]} 
      // Positioned slightly up so the edges meet the lid surface, center bulges up
      position={[0, 0.001, 0]} 
      castShadow 
      receiveShadow
    >
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={1.0} // Fully matte snow
        metalness={0.0}
      />
    </mesh>
  );
};

// --- 2. GIFT CONTENT (Magical Crystal) ---
const GiftContent = ({ color, active }: { color: string, active: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Constant rotation for magical feel
            meshRef.current.rotation.x += delta * 0.5;
            meshRef.current.rotation.y += delta * 1.0;
        }
    });

    // Reveal Animation
    const { scale, pos } = useSpring({
        scale: active ? 1 : 0,
        pos: active ? [0, 0.3, 0] : [0, 0, 0], // Float up when active
        config: { tension: 120, friction: 14 }
    });

    return (
        <animated.mesh
            ref={meshRef}
            scale={scale}
            position={pos as any} 
        >
            <icosahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial
                color="#ffffff"
                emissive={color}
                emissiveIntensity={2.0}
                roughness={0.0}
                metalness={0.5}
                toneMapped={false} // Enhance bloom
            />
        </animated.mesh>
    );
};

// --- 3. GIFT BOX COMPONENT ---
interface GiftBoxProps {
  gift: Gift;
  onOpen: (msg: string) => void;
}

const HollowGiftBox: React.FC<GiftBoxProps> = ({ gift, onOpen }) => {
  const [active, setActive] = useState(false);
  
  // CONSTANTS
  const SIZE = 0.5;
  const WALL = 0.02; 
  const HALF = SIZE / 2;
  const LID_H = 0.05; 

  const [rotation] = useState(() => [0, Math.random() * Math.PI, 0] as [number, number, number]);

  // --- GEOMETRIES ---

  // Body: Floor + 4 Walls
  const bodyGeo = useMemo(() => {
    const geos = [];
    // Floor
    const floor = new THREE.BoxGeometry(SIZE, WALL, SIZE);
    floor.translate(0, -HALF + WALL/2, 0);
    geos.push(floor);
    // Walls
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

  // Lid Frame (Sides)
  const lidRimGeo = useMemo(() => {
    const geos = [];
    const f = new THREE.BoxGeometry(SIZE, LID_H, WALL);
    f.translate(0, 0, SIZE/2 - WALL/2);
    geos.push(f);
    const b = new THREE.BoxGeometry(SIZE, LID_H, WALL);
    b.translate(0, 0, -SIZE/2 + WALL/2);
    geos.push(b);
    const l = new THREE.BoxGeometry(WALL, LID_H, SIZE - 2*WALL);
    l.translate(-SIZE/2 + WALL/2, 0, 0);
    geos.push(l);
    const r = new THREE.BoxGeometry(WALL, LID_H, SIZE - 2*WALL);
    r.translate(SIZE/2 - WALL/2, 0, 0);
    geos.push(r);

    const merged = mergeGeometries(geos);
    geos.forEach(g => g.dispose());
    return merged;
  }, [SIZE, LID_H, WALL]);

  const { lidRot, lightIntensity } = useSpring({
    lidRot: active ? -Math.PI / 1.5 : 0, 
    lightIntensity: active ? 3.0 : 0.0,
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
      
      {/* --- 1. MAIN BOX BODY --- */}
      <group position={[0, HALF, 0]}>
         {/* Container */}
         <mesh geometry={bodyGeo} material={boxMat} castShadow receiveShadow />
         
         {/* MAGICAL CONTENT INSIDE */}
         <GiftContent color={gift.color} active={active} />
         
         {/* INTERNAL LIGHTING */}
         <animated.pointLight 
            color={gift.color} 
            intensity={lightIntensity} 
            distance={2} 
            decay={2} 
            position={[0, 0.2, 0]}
         />
      </group>

      {/* --- 2. ANIMATED LID GROUP --- */}
      {/* Pivot point at the top-back edge of the box */}
      {/* @ts-ignore */}
      <animated.group position={[0, SIZE, -HALF]} rotation-x={lidRot}>
          {/* Shift back to center relative to pivot */}
          <group position={[0, 0, HALF]}>
             
             {/* A. The Lid Rims (Sides) */}
             <mesh position={[0, LID_H/2, 0]} geometry={lidRimGeo} material={boxMat} castShadow receiveShadow />

             {/* B. The Lid Top Plate (SOLID Box) */}
             {/* Sits ON TOP of the rims. */}
             <mesh position={[0, LID_H + WALL/2, 0]} castShadow receiveShadow>
                 <boxGeometry args={[SIZE, WALL, SIZE]} />
                 <primitive object={boxMat} />
             </mesh>

             {/* D. The Snow Cap - Sits directly on top of the lid plate */}
             {/* Total Y = LID_H + WALL + epsilon */}
             <group position={[0, LID_H + WALL + 0.002, 0]}>
                 <OrganicSnowCap size={SIZE * 0.95} /> 
                 {/* Scaled slightly down to not overhang the box edge strangely */}
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
