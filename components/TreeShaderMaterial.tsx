import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Custom Shader Material for the Tree Foliage
// Handles:
// 1. Snow (Fragment mix based on normal Y direction)
// 2. Static geometry (Removed wind sway/shake)
const TreeFoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#2d5a27'),
    uSnowColor: new THREE.Color('#ffffff'),
    uSnowAmount: 0.0, // 0 to 1
    uWindStrength: 0.0, 
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uWindStrength;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;

      // Wind effect REMOVED for static tree
      // No sway, no shake, just static position
      
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
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float light = max(dot(vNormal, lightDir), 0.0);
      
      // Ambient
      vec3 ambient = vec3(0.2);
      
      // Snow logic: snow lands on top surfaces (normal.y > 0)
      float snowThreshold = 0.4;
      float snowFactor = smoothstep(snowThreshold, 1.0, vNormal.y);
      
      // Mix tree color with snow color based on snow amount and normal direction
      vec3 finalColor = mix(uColor, uSnowColor, snowFactor * uSnowAmount);
      
      // Add simple shadow/light
      vec3 lighting = ambient + (light * 0.8);
      
      gl_FragColor = vec4(finalColor * lighting, 1.0);
    }
  `
);

export { TreeFoliageMaterial };