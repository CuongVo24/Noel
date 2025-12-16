import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

const PLANETS = [
  { name: 'Mercury', distance: 20, size: 0.8, color: '#A5A5A5', speed: 0.8 },
  { name: 'Venus', distance: 26, size: 1.2, color: '#E39E1C', speed: 0.6 },
  { name: 'Earth', distance: 34, size: 1.3, color: '#2E8B57', speed: 0.5, emissive: '#1144cc' },
  { name: 'Mars', distance: 40, size: 1.0, color: '#C1440E', speed: 0.4 },
  { name: 'Jupiter', distance: 54, size: 4.5, color: '#D9A066', speed: 0.2 },
  { name: 'Saturn', distance: 72, size: 3.8, color: '#EAD6B8', speed: 0.15, hasRing: true },
  { name: 'Uranus', distance: 88, size: 2.2, color: '#D1F3F6', speed: 0.1 },
  { name: 'Neptune', distance: 100, size: 2.1, color: '#4b70dd', speed: 0.08 }
];

interface PlanetData {
  name: string;
  distance: number;
  size: number;
  color: string;
  speed: number;
  emissive?: string;
  hasRing?: boolean;
}

const Planet: React.FC<{ data: PlanetData }> = ({ data }) => {
  const meshRef = useRef<THREE.Group>(null);
  // Random start angle
  const offset = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (meshRef.current) {
      // Orbit Logic
      const t = state.clock.getElapsedTime() * data.speed * 0.15; 
      const angle = t + offset.current;
      meshRef.current.position.x = Math.cos(angle) * data.distance;
      meshRef.current.position.z = Math.sin(angle) * data.distance;
      
      // Self Rotation
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[data.size, 32, 32]} />
        <meshStandardMaterial 
            color={data.color} 
            roughness={0.8} 
            emissive={data.emissive || '#000000'}
            emissiveIntensity={0.2}
        />
      </mesh>
      {data.hasRing && (
        <mesh rotation={[-Math.PI / 2.3, 0, 0]}>
            <ringGeometry args={[data.size * 1.4, data.size * 2.4, 64]} />
            <meshStandardMaterial color="#C5A678" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};

const Sun = () => {
    // Position matches the DirectionalLight in SceneContainer
    // Scaled up geometry (was 8, now 14) and boosted brightness
    // UPDATED: Scaled by 1.5x as requested
    return (
        <mesh position={[50, 20, 50]} scale={1.5}>
            <sphereGeometry args={[14, 64, 64]} />
            <meshStandardMaterial 
                color="#FDB813" 
                emissive="#FDB813"
                emissiveIntensity={4}
                toneMapped={false}
            />
            <pointLight intensity={2.5} distance={500} decay={1.5} color="#FDB813" />
            
            {/* Sun Glow/Atmosphere */}
            <mesh scale={1.3}>
                <sphereGeometry args={[14, 32, 32]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.BackSide} />
            </mesh>
        </mesh>
    );
}

const StarField = () => {
    const count = 3000;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    
    // Generate static positions
    const [positions, scales] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sc = new Float32Array(count);
        for(let i=0; i<count; i++) {
            // Distribute randomly in a large sphere, avoiding the center area
            const r = 120 + Math.random() * 300;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i*3+2] = r * Math.cos(phi);
            
            sc[i] = 0.5 + Math.random() * 1.5;
        }
        return [pos, sc];
    }, []);

    const dummy = new THREE.Object3D();

    useFrame((state) => {
        if(!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        
        for(let i=0; i<count; i++) {
            dummy.position.set(
                positions[i*3],
                positions[i*3+1],
                positions[i*3+2]
            );
            // Twinkle effect: Sine wave based on time and index
            const s = scales[i] * (0.7 + 0.3 * Math.sin(time * 2 + i * 13.5));
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[0.15, 6, 6]} />
            <meshBasicMaterial color="white" toneMapped={false} />
        </instancedMesh>
    )
}

export const SolarSystem = () => {
    return (
        <group>
            <Sun />
            {PLANETS.map((p) => <Planet key={p.name} data={p} />)}
            <StarField />
        </group>
    )
}
