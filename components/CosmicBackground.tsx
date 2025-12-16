import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import '../types';

// Simple Starfield using Points
const Stars = ({ count = 2000 }) => {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 400 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        p[i*3] = r * Math.sin(phi) * Math.cos(theta);
        p[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        p[i*3+2] = r * Math.cos(phi);
        
        // Color variation (Blue/White/Gold)
        const colorType = Math.random();
        let col = new THREE.Color();
        if(colorType > 0.9) col.setHex(0xffaa00); // Gold
        else if(colorType > 0.7) col.setHex(0xaaaaaa); // Blue-ish
        else col.setHex(0xffffff); // White
        
        c[i*3] = col.r;
        c[i*3+1] = col.g;
        c[i*3+2] = col.b;
    }
    return { positions: p, colors: c };
  }, [count]);

  return (
    <points>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={count} array={points.positions} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={count} array={points.colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={1.5} vertexColors sizeAttenuation transparent opacity={0.8} />
    </points>
  )
}

// Procedural Nebula Shader
const NebulaSphere = () => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    const vertexShader = `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec3 vWorldPos;
      
      // Simplex 3D Noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      uniform float uTime;

      void main() {
        vec3 dir = normalize(vWorldPos);
        
        // Multi-layered noise for nebula clouds
        float n1 = snoise(dir * 2.0 + vec3(uTime * 0.05));
        float n2 = snoise(dir * 5.0 - vec3(uTime * 0.02));
        
        float combined = (n1 + n2 * 0.5);
        
        // Color Mapping
        vec3 deepSpace = vec3(0.02, 0.02, 0.05); // Dark Blue/Black
        vec3 nebulaPurple = vec3(0.2, 0.0, 0.3);
        vec3 nebulaTeal = vec3(0.0, 0.2, 0.25);
        
        vec3 color = deepSpace;
        
        // Mix colors based on noise
        if (combined > 0.2) {
            color = mix(color, nebulaPurple, (combined - 0.2) * 1.5);
        }
        if (combined < -0.1) {
            color = mix(color, nebulaTeal, abs(combined + 0.1) * 1.5);
        }
        
        // Soft gradient from bottom to top (Horizon feels lighter)
        float yGradient = smoothstep(-1.0, 1.0, dir.y);
        color += vec3(0.05, 0.02, 0.1) * yGradient;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    useFrame((state) => {
        if(materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh>
            <sphereGeometry args={[450, 32, 32]} />
            <shaderMaterial 
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                side={THREE.BackSide}
                uniforms={{ uTime: { value: 0 } }}
            />
        </mesh>
    );
}

export const CosmicBackground = () => {
  return (
    <group>
        <NebulaSphere />
        <Stars count={3000} />
    </group>
  );
};
