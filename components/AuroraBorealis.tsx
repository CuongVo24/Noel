import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import '../types';

const AuroraShaderMaterial = {
    uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#00ffcc') }, // Cyan
        uColor2: { value: new THREE.Color('#9933ff') }  // Purple
    },
    vertexShader: `
        varying vec2 vUv;
        uniform float uTime;

        void main() {
            vUv = uv;
            vec3 newPos = position;
            
            // Waving motion sine wave based on X coordinate and Time
            float sineWave = sin(position.x * 0.2 + uTime * 0.8) * 5.0;
            // Dampen at the bottom (y=0) so it stays grounded
            newPos.z += sineWave * smoothstep(0.0, 20.0, position.y);
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        void main() {
            // Curtain shape: Vertical gradient fading at top and bottom
            float alpha = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
            
            // Moving bands of light
            float noise = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
            float bands = smoothstep(0.4, 0.6, noise);
            
            // Mix colors
            vec3 color = mix(uColor1, uColor2, vUv.x);
            
            // Additive glow logic
            gl_FragColor = vec4(color, alpha * bands * 0.4); 
        }
    `
};

export const AuroraBorealis = () => {
    const materialRef1 = useRef<THREE.ShaderMaterial>(null);
    const materialRef2 = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if(materialRef1.current) materialRef1.current.uniforms.uTime.value = t;
        if(materialRef2.current) materialRef2.current.uniforms.uTime.value = t;
    });

    const mat1 = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...AuroraShaderMaterial,
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color('#00ffcc') },
                uColor2: { value: new THREE.Color('#9933ff') }
            },
            side: THREE.DoubleSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }, []);

    const mat2 = useMemo(() => {
        return new THREE.ShaderMaterial({
            ...AuroraShaderMaterial,
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color('#44ff44') }, // Greenish
                uColor2: { value: new THREE.Color('#0088ff') }  // Blueish
            },
            side: THREE.DoubleSide,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }, []);

    return (
        <group position={[0, -5, -80]} rotation={[0, 0, 0]}>
            {/* Primary Curtain */}
            <mesh scale={[3, 1.5, 1]}>
                <cylinderGeometry args={[50, 50, 40, 64, 16, true, Math.PI, Math.PI]} />
                <primitive object={mat1} attach="material" />
            </mesh>
             {/* Secondary Curtain offset */}
             <mesh position={[0, 5, -10]} scale={[3.2, 1.8, 1]} rotation={[0, 0.2, 0]}>
                <cylinderGeometry args={[52, 52, 45, 64, 16, true, Math.PI, Math.PI]} />
                <primitive object={mat2} attach="material" />
            </mesh>
        </group>
    );
};
