import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface TreeSnowMaterialProps {
  color: string;
  snowAmount: number;
}

// Simplex Noise GLSL function
const NOISE_GLSL = `
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
`;

export const TreeSnowMaterial: React.FC<TreeSnowMaterialProps> = ({ color, snowAmount }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const onBeforeCompile = (shader: THREE.Shader) => {
    // 1. Add Uniforms
    shader.uniforms.uSnowAmount = { value: 0 };
    shader.uniforms.uSnowColor = { value: new THREE.Color('#ffffff') };

    materialRef.current!.userData.shader = shader;

    // 2. Vertex Shader: Calculate vPos and vWorldNormal
    shader.vertexShader = `
      varying vec3 vPos;
      varying vec3 vWorldNormal;
      ${shader.vertexShader}
    `;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      // Calculate world position
      vPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      // Calculate world normal for robust "Up" detection
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      `
    );

    // 3. Fragment Shader: Inject Noise and Mixing Logic
    shader.fragmentShader = `
      uniform float uSnowAmount;
      uniform vec3 uSnowColor;
      varying vec3 vPos;
      varying vec3 vWorldNormal;
      ${NOISE_GLSL}
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      // Calculate Up-ness based on WORLD SPACE normal
      float upDot = normalize(vWorldNormal).y;

      // Noise Generation based on World Position (scaled for texture density)
      float noiseVal = snoise(vPos * 2.5); // Scale 2.5 determines patch size
      
      // Normalize noise from [-1,1] to [0,1]
      float n = (noiseVal + 1.0) * 0.5;

      // Patchy Logic: Combine Up-ness with Noise
      // Snow appears if surface faces up AND noise value is high.
      
      float threshold = 0.6 - (uSnowAmount * 0.5); // As snow amount increases, threshold drops
      float snowFactor = smoothstep(threshold, threshold + 0.1, upDot * n);
      
      // Ensure we only get snow on UP facing normals (vWorldNormal.y > 0)
      snowFactor *= smoothstep(0.0, 0.2, upDot);

      vec3 finalColor = mix(gl_FragColor.rgb, uSnowColor, snowFactor * clamp(uSnowAmount * 1.5, 0.0, 1.0));
      
      gl_FragColor = vec4(finalColor, gl_FragColor.a);
      `
    );
  };

  useFrame(() => {
    if (materialRef.current?.userData.shader) {
      materialRef.current.userData.shader.uniforms.uSnowAmount.value = snowAmount;
    }
  });

  return (
    <meshStandardMaterial
      ref={materialRef}
      color={color}
      roughness={0.9} // Increased roughness for foliage
      metalness={0.0}
      side={THREE.DoubleSide} // CRITICAL: Ensures snow is visible on all leaf faces
      onBeforeCompile={onBeforeCompile}
    />
  );
};