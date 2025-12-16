import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

const Reindeer = ({ offset }: { offset: [number, number, number] }) => (
    <group position={offset}>
        {/* Body */}
        <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.6]} />
            <meshStandardMaterial color="#5D4037" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.3, 0.3]}>
            <boxGeometry args={[0.2, 0.2, 0.25]} />
            <meshStandardMaterial color="#5D4037" />
        </mesh>
        {/* Legs */}
        <mesh position={[0.1, -0.25, 0.2]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#3E2723" />
        </mesh>
         <mesh position={[-0.1, -0.25, 0.2]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#3E2723" />
        </mesh>
         <mesh position={[0.1, -0.25, -0.2]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#3E2723" />
        </mesh>
         <mesh position={[-0.1, -0.25, -0.2]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#3E2723" />
        </mesh>
        {/* Antlers (Simple) */}
        <mesh position={[0.1, 0.5, 0.3]} rotation={[0, 0, 0.5]}>
             <cylinderGeometry args={[0.01, 0.01, 0.3]} />
             <meshStandardMaterial color="#A1887F" />
        </mesh>
        <mesh position={[-0.1, 0.5, 0.3]} rotation={[0, 0, -0.5]}>
             <cylinderGeometry args={[0.01, 0.01, 0.3]} />
             <meshStandardMaterial color="#A1887F" />
        </mesh>
    </group>
);

export const FlyingSanta = () => {
    const groupRef = useRef<THREE.Group>(null);
    const particleRef = useRef<THREE.Points>(null);

    // Create Path
    const curve = useMemo(() => {
        // Points creating a wobbly circle around the center
        const points = [];
        const radius = 25;
        for (let i = 0; i <= 10; i++) {
            const t = (i / 10) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.sin(t) * radius,
                15 + Math.sin(t * 3) * 5, // Wobbly height
                Math.cos(t) * radius
            ));
        }
        return new THREE.CatmullRomCurve3(points, true);
    }, []);

    // Particle Trail Data
    const trailCount = 50;
    const trailPos = useMemo(() => new Float32Array(trailCount * 3), []);
    const trailIdx = useRef(0);

    useFrame((state) => {
        const t = (state.clock.getElapsedTime() * 0.05) % 1;
        const pos = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        
        if (groupRef.current) {
            groupRef.current.position.copy(pos);
            // Look ahead
            const lookAt = pos.clone().add(tangent);
            groupRef.current.lookAt(lookAt);
        }

        // Update trail particles (simple emitter)
        if (particleRef.current) {
            // Emit a particle at current position (offset slightly behind)
            const pIndex = trailIdx.current;
            trailPos[pIndex * 3] = pos.x - tangent.x * 2 + (Math.random()-0.5);
            trailPos[pIndex * 3 + 1] = pos.y - tangent.y * 2 + (Math.random()-0.5);
            trailPos[pIndex * 3 + 2] = pos.z - tangent.z * 2 + (Math.random()-0.5);
            
            trailIdx.current = (trailIdx.current + 1) % trailCount;
            
            particleRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <>
            <group ref={groupRef}>
                {/* SLEIGH */}
                <group>
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[1, 0.5, 1.5]} />
                        <meshStandardMaterial color="#D32F2F" />
                    </mesh>
                     {/* Runners */}
                    <mesh position={[0.4, -0.4, 0]}>
                        <boxGeometry args={[0.1, 0.1, 1.8]} />
                        <meshStandardMaterial color="#B0BEC5" metalness={0.8} />
                    </mesh>
                    <mesh position={[-0.4, -0.4, 0]}>
                        <boxGeometry args={[0.1, 0.1, 1.8]} />
                        <meshStandardMaterial color="#B0BEC5" metalness={0.8} />
                    </mesh>

                    {/* SANTA */}
                    <group position={[0, 0.5, -0.2]}>
                         {/* Body */}
                         <mesh>
                             <sphereGeometry args={[0.4]} />
                             <meshStandardMaterial color="#D32F2F" />
                         </mesh>
                         {/* Head */}
                         <mesh position={[0, 0.5, 0]}>
                             <sphereGeometry args={[0.25]} />
                             <meshStandardMaterial color="#FFCCBC" />
                         </mesh>
                         {/* Beard */}
                         <mesh position={[0, 0.4, 0.2]}>
                             <sphereGeometry args={[0.2]} />
                             <meshStandardMaterial color="white" />
                         </mesh>
                    </group>
                </group>

                {/* REINDEER TEAM */}
                <group position={[0, -0.2, 1.5]}>
                    <Reindeer offset={[0.5, 0, 1]} />
                    <Reindeer offset={[-0.5, 0, 1]} />
                    <Reindeer offset={[0.5, 0, 2.5]} />
                    <Reindeer offset={[-0.5, 0, 2.5]} />
                </group>
            </group>

            {/* MAGIC DUST TRAIL */}
            <points ref={particleRef}>
                <bufferGeometry>
                    <bufferAttribute 
                        attach="attributes-position" 
                        count={trailCount} 
                        array={trailPos} 
                        itemSize={3} 
                    />
                </bufferGeometry>
                <pointsMaterial color="#FFD700" size={0.2} transparent opacity={0.8} />
            </points>
        </>
    );
};
