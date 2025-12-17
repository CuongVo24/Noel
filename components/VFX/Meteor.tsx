import React, { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MeteorProps {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    onComplete: () => void;
}

export const Meteor: React.FC<MeteorProps> = ({ startPos, endPos, onComplete }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const progressRef = useRef(0);
    const trailRef = useRef<THREE.Mesh>(null);

    // Initial setup for Position and Rotation
    useLayoutEffect(() => {
        // Set initial position immediately to avoid flicker or prop conflict
        if (meshRef.current) {
            meshRef.current.position.copy(startPos);
        }
        
        // Calculate orientation to look at end position
        if (groupRef.current) {
            const dummy = new THREE.Object3D();
            dummy.position.copy(startPos);
            dummy.lookAt(endPos);
            // Adjust for cylinder default orientation (Y-up) to point forward (Z)
            dummy.rotateX(-Math.PI / 2);
            groupRef.current.quaternion.copy(dummy.quaternion);
        }
    }, [startPos, endPos]);

    useFrame((state, delta) => {
        progressRef.current += delta * 1.5; // Speed
        
        if (progressRef.current >= 1.0) {
            onComplete();
            return;
        }

        if (meshRef.current) {
            meshRef.current.position.lerpVectors(startPos, endPos, progressRef.current);
            // Spin
            meshRef.current.rotation.z += 10 * delta;
            
            // Tail scaling logic
            if (trailRef.current) {
                const tailScale = 1.0 - progressRef.current; // Shrink as it goes
                trailRef.current.scale.y = 5 + (tailScale * 5);
            }
        }
    });

    return (
        <group ref={groupRef}>
             {/* Note: DO NOT pass position prop here. We handle it in useLayoutEffect/useFrame to avoid read-only conflict */}
             <mesh ref={meshRef}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
                
                {/* Tail */}
                <mesh ref={trailRef} position={[0, -2, 0]}>
                    <cylinderGeometry args={[0.02, 0.3, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
                </mesh>
            </mesh>
        </group>
    );
};