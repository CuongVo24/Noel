import React, { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Gift } from '../types';
import { getSnowHeight } from '../utils/snowMath';
import { generateGenZWish } from '../utils/gemini';
import { audioManager } from '../utils/audio';

// Static mock gifts with Natural Vietnamese Jokes (Sarcastic & Funny)
// Repositioned to avoid clipping with the tree (Radius > 2.5)
const STATIC_GIFTS: Gift[] = [
    { id: 'g1', position: [2.5, -0.15, 2.2], color: '#d32f2f', message: 'Đừng để cái lạnh của mùa đông đánh lừa rằng bạn cần người yêu. Thứ bạn cần là Tiền! 💸', sender: 'Sự thật mất lòng', opened: false },
    { id: 'g2', position: [-2.5, -0.15, 1.8], color: '#1976d2', message: 'Noel này vẫn giống Noel xưa. Vẫn đi xe máy... vẫn chưa có bồ. Cay! 🌶️', sender: 'Hội người ế', opened: false },
    { id: 'g3', position: [1.2, -0.15, -2.8], color: '#388e3c', message: 'Thông báo: Tuyển người yêu đi chơi Noel. Yêu cầu: Còn thở là được. Gấp lắm rồi! 🆘', sender: 'Tuyển dụng', opened: false },
    { id: 'g4', position: [3.2, -0.15, 0.5], color: '#ffeb3b', message: 'Chúc bạn Noel vui vẻ! Nếu không vui thì... thôi, sang năm vui bù vậy. 🤣', sender: 'Bạn thân', opened: false },
    { id: 'g5', position: [-2.8, -0.15, -2.5], color: '#9c27b0', message: 'Gương kia ngự ở trên tường. Noel ai sẽ ra đường cùng ta? Gương cười gương bảo: Ở nhà cho xong! 🪞', sender: 'Cổ tích', opened: false },
    { id: 'g6', position: [3.5, -0.15, -1.5], color: '#00bcd4', message: 'Giáng sinh là dịp để quây quần bên gia đình. Nên là... ai rủ đi chơi nhớ bao tui ăn nhé! 🍗', sender: 'Thực thần', opened: false },
    { id: 'g7', position: [-4.0, -0.15, 1.5], color: '#ff5722', message: 'Quyết tâm Noel không tiêu tiền! Để dành tiền tiêu Tết (mà Tết cũng chả có tiền đâu) 🥲', sender: 'Ví rỗng', opened: false },
    { id: 'g8', position: [0, -0.15, 3.5], color: '#e91e63', message: 'Trời lạnh quá, ước gì có ai ôm... một đống tiền ném vào mặt mình nhỉ? 😍', sender: 'Mộng mơ', opened: false },
    { id: 'g9', position: [-1.8, -0.15, 3.2], color: '#795548', message: 'Chúc mừng bạn đã quay vào ô "Mất lượt". Năm nay vẫn ế tiếp nhé! Xin chia buồn. 🎲', sender: 'Định mệnh', opened: false },
    { id: 'g10', position: [2.5, -0.15, 3.0], color: '#607d8b', message: 'Thôi đừng buồn vì Noel ế. Vì bình thường bạn cũng có người yêu đâu? Tỉnh táo lên! 🧠', sender: 'Gáo nước lạnh', opened: false },
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
    
    // Animation refs
    const currentScale = useRef(0);
    const currentY = useRef(0);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Constant rotation for magical feel
            meshRef.current.rotation.x += delta * 0.5;
            meshRef.current.rotation.y += delta * 1.0;
            
            // Animation Targets
            const targetScale = active ? 1 : 0;
            const targetY = active ? 0.3 : 0;

            // Lerp towards target (Simulate Spring)
            currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, delta * 6);
            currentY.current = THREE.MathUtils.lerp(currentY.current, targetY, delta * 6);

            meshRef.current.scale.setScalar(currentScale.current);
            meshRef.current.position.set(0, currentY.current, 0);
        }
    });

    return (
        <mesh
            ref={meshRef}
            scale={0} // Initial scale
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
        </mesh>
    );
};

// --- 3. GIFT BOX COMPONENT ---
interface GiftBoxProps {
  gift: Gift;
  onOpen: (msg: string) => void;
}

const HollowGiftBox: React.FC<GiftBoxProps> = ({ gift, onOpen }) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const groupRef = useRef<THREE.Group>(null);
  const lidGroupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Animation State
  const anim = useRef({ lidRot: 0, lightIntensity: 0 });
  
  // CONSTANTS
  const SIZE = 0.5;
  const WALL = 0.02; 
  const HALF = SIZE / 2;
  const LID_H = 0.05; 

  const [initialRotation] = useState(() => [0, Math.random() * Math.PI, 0] as [number, number, number]);

  // Combined Animation Loop
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Loading Vibration Effect
    if (loading && groupRef.current) {
       // Fast jitter to indicate "something is happening"
       groupRef.current.rotation.z = Math.sin(t * 40) * 0.03;
       groupRef.current.rotation.x = Math.cos(t * 35) * 0.03;
       groupRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.02);
    } else if (groupRef.current) {
        // Reset transform when not loading
        groupRef.current.rotation.z = 0;
        groupRef.current.rotation.x = 0;
        groupRef.current.scale.setScalar(1);
    }

    // 2. Opening Animation
    const targetLidRot = active ? -Math.PI / 1.5 : 0;
    const targetIntensity = active ? 3.0 : 0.0;
    
    // Smooth transitions
    anim.current.lidRot = THREE.MathUtils.lerp(anim.current.lidRot, targetLidRot, delta * 8);
    anim.current.lightIntensity = THREE.MathUtils.lerp(anim.current.lightIntensity, targetIntensity, delta * 8);

    if (lidGroupRef.current) {
        lidGroupRef.current.rotation.x = anim.current.lidRot;
    }
    if (lightRef.current) {
        lightRef.current.intensity = anim.current.lightIntensity;
    }
  });

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

  const handleClick = async (e: any) => {
    e.stopPropagation();
    
    // If already open, just re-show the message (no AI call)
    if (active) {
        onOpen(gift.message); // Fallback to current message state?
        return;
    }

    if (loading) return;

    // Start Loading Sequence
    setLoading(true);
    audioManager.playSleighBells(); // Sound clue

    // Fetch Unique Wish from Gemini
    let finalMessage = gift.message; // Default fallback
    try {
        const genZWish = await generateGenZWish();
        if (genZWish) {
            finalMessage = genZWish;
        }
    } catch (err) {
        console.warn("Using fallback wish due to error.");
    }

    // Finish Loading
    setLoading(false);
    setActive(true);
    onOpen(finalMessage);
    audioManager.playChime();
  };

  const boxMat = new THREE.MeshStandardMaterial({
      color: gift.color,
      roughness: 0.6,
  });

  return (
    <group position={gift.position} rotation={initialRotation}>
      <group ref={groupRef} onClick={handleClick}>
        {/* --- 1. MAIN BOX BODY --- */}
        <group position={[0, HALF, 0]}>
            {/* Container */}
            <mesh geometry={bodyGeo} material={boxMat} castShadow receiveShadow />
            
            {/* MAGICAL CONTENT INSIDE */}
            <GiftContent color={gift.color} active={active} />
            
            {/* INTERNAL LIGHTING */}
            <pointLight 
                ref={lightRef}
                color={gift.color} 
                intensity={0} // Controlled by useFrame
                distance={2} 
                decay={2} 
                position={[0, 0.2, 0]}
            />
        </group>

        {/* --- 2. ANIMATED LID GROUP --- */}
        {/* Pivot point at the top-back edge of the box */}
        <group ref={lidGroupRef} position={[0, SIZE, -HALF]}>
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
        </group>
      </group>

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
        return STATIC_GIFTS.map(g => ({
            ...g,
            position: [
                g.position[0],
                // SINK OFFSET: -0.15 to bury it in snow to appear heavy
                getSnowHeight(g.position[0], g.position[2]) - 0.15,
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