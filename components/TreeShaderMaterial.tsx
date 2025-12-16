import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import '../types';

interface TreeSnowMaterialProps {
  color: string;
  snowAmount: number;
}

// Simplex Noise GLSL (Shared)
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

  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uSnowAmount = { value: 0 };
    shader.uniforms.uSnowColor = { value: new THREE.Color('#ffffff') };
    
    materialRef.current!.userData.shader = shader;

    // --- VERTEX SHADER ---
    shader.vertexShader = `
      varying vec3 vPos;
      varying vec3 vWorldNormal;
      varying float vSnowFactor;
      ${NOISE_GLSL}
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // Calculate world info
      vec3 worldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vec3 worldNorm = normalize(mat3(modelMatrix) * normal);
      vPos = worldPos;
      vWorldNormal = worldNorm;

      // NOISE SCALE REDUCED: 0.6 (Was 3.0)
      // This creates larger, fluffier "drifts" instead of static noise.
      float noise = snoise(worldPos * 0.6); 
      float upDot = dot(worldNorm, vec3(0.0, 1.0, 0.0));
      
      // THRESHOLD: STRICTER UP-FACING
      // Only allow snow if surface points significantly up (> 0.6)
      // Added noise has large amplitude (0.4) to create variations.
      float snowThreshold = 0.6; 
      float snowMask = smoothstep(snowThreshold, 1.0, upDot + noise * 0.4);
      
      vSnowFactor = snowMask;

      // DISPLACEMENT
      // Bulge out significant snow patches
      if (snowMask > 0.1) {
          float thickness = snowMask * 0.08; 
          transformed += normal * thickness;
      }
      `
    );

    // --- FRAGMENT SHADER ---
    shader.fragmentShader = `
      uniform float uSnowAmount;
      uniform vec3 uSnowColor;
      varying vec3 vPos;
      varying vec3 vWorldNormal;
      varying float vSnowFactor;
      ${NOISE_GLSL}
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      // FRAGMENT NOISE: Matched lower frequency (1.5) for consistency with vertex shapes
      // Added a second layer of tiny noise (10.0) for surface texture only
      float shapeNoise = snoise(vPos * 1.5);
      float textureNoise = snoise(vPos * 10.0);
      
      // Snow Coverage Logic
      float upDot = dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0));
      
      // Adjustable threshold
      float threshold = 1.0 - (uSnowAmount * 1.4);
      
      // SHARPER TRANSITION: 
      // smoothstep range is tight (0.05) to create defined edges of snow clumps
      float coverage = smoothstep(threshold, threshold + 0.05, upDot + shapeNoise * 0.3);
      
      float finalSnowMix = max(coverage, vSnowFactor * uSnowAmount);
      
      // TEXTURE: White snow with subtle grain
      vec3 snowySurface = uSnowColor * (0.98 + 0.02 * textureNoise);

      // SPARKLES: High frequency glitter
      vec3 viewDir = normalize(cameraPosition - vPos);
      float sparkleNoise = snoise(vPos * 50.0 + viewDir * 5.0); 
      float sparkles = smoothstep(0.8, 1.0, sparkleNoise) * 2.0; 
      
      snowySurface += vec3(sparkles);

      // MIX: Use finalSnowMix to blend
      vec3 finalColor = mix(gl_FragColor.rgb, snowySurface, finalSnowMix);

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
      roughness={0.9} 
      metalness={0.1}
      side={THREE.DoubleSide}
      onBeforeCompile={onBeforeCompile}
    />
  );
};
