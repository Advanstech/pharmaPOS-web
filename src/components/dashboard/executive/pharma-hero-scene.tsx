'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import type { Mesh } from 'three';

function ExecutiveCapsule() {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.35;
      mesh.current.rotation.x = 0.15 + Math.sin(performance.now() / 2400) * 0.08;
    }
  });
  return (
    <Float speed={1.8} rotationIntensity={0.15} floatIntensity={0.35}>
      <mesh ref={mesh} castShadow>
        <capsuleGeometry args={[0.32, 1.15, 10, 24]} />
        <meshStandardMaterial
          color="#0d9488"
          metalness={0.45}
          roughness={0.22}
          emissive="#134e4a"
          emissiveIntensity={0.15}
        />
      </mesh>
    </Float>
  );
}

function SecondaryPill() {
  const mesh = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y -= delta * 0.25;
  });
  return (
    <mesh ref={mesh} position={[1.15, -0.2, -0.4]} scale={0.55} castShadow>
      <capsuleGeometry args={[0.28, 0.9, 8, 20]} />
      <meshStandardMaterial color="#e8a838" metalness={0.35} roughness={0.35} />
    </mesh>
  );
}

export default function PharmaHeroScene() {
  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{ position: [0, 0.1, 3.6], fov: 42 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.55} />
      <spotLight position={[4, 6, 4]} intensity={1.1} angle={0.4} penumbra={0.5} castShadow />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color="#5eead4" />
      <ExecutiveCapsule />
      <SecondaryPill />
    </Canvas>
  );
}
