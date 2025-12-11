import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Custom Shader Material for the Tree Foliage
// Handles:
// 1. Snow (Mix based on Up-facing Normals)
const TreeFoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#2d5a27'),
    uSnowColor: new THREE.Color('#ffffff'),
    uSnowAmount: 0.0, // 0 to 1
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uColor;
    uniform vec3 uSnowColor;
    uniform float uSnowAmount;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Basic lighting (lambert approximation)
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
      float light = max(dot(vNormal, lightDir), 0.0);
      
      // Ambient
      vec3 ambient = vec3(0.3);
      
      // Snow Logic: Dot Product of Normal and Up Vector (0,1,0)
      // Since vNormal is in view space or local space depending on matrix, 
      // y component effectively represents the "up-ness".
      float upDot = vNormal.y;
      
      // Smoothstep for soft transition. 
      // Lower edge 0.3, upper edge 0.8 creates a gradient.
      float snowThreshold = 0.3; 
      float snowFactor = smoothstep(snowThreshold, 0.8, upDot);
      
      // Mix tree color with snow color based on snow amount and calculated factor
      // Clamped to ensure valid colors
      vec3 baseColor = mix(uColor, uSnowColor, snowFactor * uSnowAmount);
      
      // Apply lighting
      vec3 lighting = ambient + (light * 0.7);
      
      gl_FragColor = vec4(baseColor * lighting, 1.0);
    }
  `
);

export { TreeFoliageMaterial };