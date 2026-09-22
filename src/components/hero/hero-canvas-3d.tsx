'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Sphere } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useWebGL } from '@/hooks/use-webgl';
import styles from './hero-canvas-3d.module.css';

// --- Capsules (Floating Medication) ---
const CAPSULE_DATA = [
  { position: [-3, 1, -2], scale: 0.6, speed: 0.003 },
  { position: [4, 2, -3], scale: 0.8, speed: 0.005 },
  { position: [2, -2, -1], scale: 0.5, speed: 0.004 },
  { position: [-4, -1, -4], scale: 0.7, speed: 0.008 },
];

function FloatingCapsules() {
  const group = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  useFrame((state, delta) => {
    if (!group.current) return;
    
    // Gentle float animation
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;

    // Mouse parallax reaction
    const targetX = mouse.x * 0.5;
    const targetY = mouse.y * 0.5;
    
    group.current.rotation.x += (targetY - group.current.rotation.x) * 0.02;
    group.current.rotation.y += (targetX - group.current.rotation.y) * 0.02;
  });

  return (
    <group ref={group}>
      {CAPSULE_DATA.map((data, i) => (
        <Capsule key={i} position={new THREE.Vector3(...data.position)} scale={data.scale} speed={data.speed} />
      ))}
    </group>
  );
}

function Capsule({ position, scale, speed }: { position: THREE.Vector3, scale: number, speed: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  
  // Custom geometry: Sphere + Cylinder merged, or just use CapsuleGeometry
  const geometry = useMemo(() => new THREE.CapsuleGeometry(0.5, 1, 16, 32), []);

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += speed;
      mesh.current.rotation.y += speed * 1.2;
    }
  });

  return (
    <mesh ref={mesh} position={position} scale={scale} geometry={geometry} castShadow>
      {/* Two tone material trick: use a gradient or just a standard material for now */}
      <meshStandardMaterial 
        color="#00BFA6"
        metalness={0.2}
        roughness={0.4}
        transparent={true}
        opacity={0.85}
      />
    </mesh>
  );
}

// --- Torus Knot (Holographic DNA/Molecule) ---
function HolographicKnot() {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.TorusKnotGeometry(1.2, 0.08, 200, 16), []);

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.y -= 0.004;
      mesh.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
    }
  });

  return (
    <mesh ref={mesh} position={[3, 0, -2]} geometry={geometry}>
      <meshPhysicalMaterial 
        color="#00BFA6"
        emissive="#1DE9B6"
        emissiveIntensity={0.4}
        metalness={0.8}
        roughness={0.1}
        wireframe={false}
        transparent={true}
        opacity={0.75}
      />
    </mesh>
  );
}

// --- Particle Field (Stock Data Constellation) ---
function ParticleField({ count = 800 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorTeal = new THREE.Color('#00BFA6');
    const colorAmber = new THREE.Color('#FFB300');
    const colorDanger = new THREE.Color('#FF3D57');

    for (let i = 0; i < count; i++) {
      // Random position in sphere radius 6
      const r = 6 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 2; // Offset Z

      // Colors: 70% teal, 20% amber, 10% danger
      const rand = Math.random();
      const color = rand > 0.3 ? colorTeal : (rand > 0.1 ? colorAmber : colorDanger);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.elapsedTime * 0.05;
  });

  return (
    <group>
      <points ref={points} 
        onPointerMove={(e) => {
          if (e.index !== undefined) {
            setHovered(e.index);
          }
        }}
        onPointerOut={() => setHovered(null)}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlesPosition.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[particlesPosition.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} vertexColors transparent opacity={0.6} sizeAttenuation />
      </points>

      {hovered !== null && (
        <Html position={[
          particlesPosition.positions[hovered * 3],
          particlesPosition.positions[hovered * 3 + 1],
          particlesPosition.positions[hovered * 3 + 2]
        ]}>
          <div className={styles.particleTooltip}>
            Amoxicillin 500mg &middot; 42 units &middot; Exp: Dec 2026
          </div>
        </Html>
      )}
    </group>
  );
}

// --- Main Canvas Component ---
export function HeroCanvas3D() {
  const hasWebGL = useWebGL();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!hasWebGL) {
    return <div className={styles.fallbackGradient} />;
  }

  return (
    <div className={styles.canvasWrapper}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={isMobile ? 1 : [1, 2]}
        frameloop="always"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} color="#1DE9B6" intensity={1.5} />
        <pointLight position={[-5, -3, -2]} color="#0A4FFF" intensity={0.8} />
        <spotLight position={[0, 8, 2]} angle={0.3} penumbra={0.8} intensity={2} castShadow />

        <FloatingCapsules />
        <HolographicKnot />
        <ParticleField count={isMobile ? 200 : 800} />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} />

        {!isMobile && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.3} intensity={1.2} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
