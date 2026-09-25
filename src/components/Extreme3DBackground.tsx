import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Orbit, Zap } from 'lucide-react';

interface Extreme3DBackgroundProps {
  interactive?: boolean;
  theme?: 'dark' | 'light';
  scrollY?: number;
  isGenerating?: boolean;
}

export const Extreme3DBackground: React.FC<Extreme3DBackgroundProps> = ({
  interactive = true,
  theme = 'dark',
  scrollY = 0,
  isGenerating = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [paletteMode, setPaletteMode] = useState<'cyber-space' | 'quantum-nebula' | 'event-horizon'>('cyber-space');
  const [showControls, setShowControls] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [warpActive, setWarpActive] = useState(false);

  // References for animation loop control
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Dynamic interactive objects
  const coreGroupRef = useRef<THREE.Group | null>(null);
  const mainOrbRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.Mesh | null>(null);
  const torusRef1 = useRef<THREE.Mesh | null>(null);
  const torusRef2 = useRef<THREE.Mesh | null>(null);
  const torusRef3 = useRef<THREE.Mesh | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);

  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const primaryLightRef = useRef<THREE.PointLight | null>(null);
  const secondaryLightRef = useRef<THREE.PointLight | null>(null);

  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollTargetRef = useRef<number>(0);
  const currentScrollRef = useRef<number>(0);
  const isGeneratingRef = useRef<boolean>(isGenerating);

  // Synchronize generation state into ref for 60fps render loop
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Keep scroll target updated smoothly
  useEffect(() => {
    scrollTargetRef.current = scrollY;
  }, [scrollY]);

  // Adjust lights, fog & materials when theme (dark/light) changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const isLight = theme === 'light';
    const fogColor = isLight ? 0xf8fafc : 0x090a10;
    scene.fog = new THREE.FogExp2(fogColor, 0.0032);

    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(isLight ? 0xf1f5f9 : 0x0f172a);
      ambientLightRef.current.intensity = isLight ? 3.8 : 2.5;
    }

    if (primaryLightRef.current) {
      primaryLightRef.current.intensity = isLight ? 11 : 8;
    }

    if (mainOrbRef.current) {
      const mat = mainOrbRef.current.material as THREE.MeshPhysicalMaterial;
      mat.color.setHex(isLight ? 0xffffff : 0x071526);
      mat.roughness = isLight ? 0.2 : 0.15;
    }

    if (wireMeshRef.current) {
      const mat = wireMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(isLight ? 0x0284c7 : 0x22d3ee);
      mat.opacity = isLight ? 0.4 : 0.25;
    }
  }, [theme]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Depth Fog setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isLight = theme === 'light';
    scene.fog = new THREE.FogExp2(isLight ? 0xf8fafc : 0x090a10, 0.0035);

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1500);
    camera.position.set(0, 0, 95);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and high depth precision
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isLight ? 1.4 : 1.25;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(isLight ? 0xf1f5f9 : 0x0f172a, isLight ? 3.8 : 2.5);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const primaryLight = new THREE.PointLight(0x06b6d4, isLight ? 11 : 8, 280);
    primaryLight.position.set(45, 35, 60);
    scene.add(primaryLight);
    primaryLightRef.current = primaryLight;

    const secondaryLight = new THREE.PointLight(0x8b5cf6, 6, 250);
    secondaryLight.position.set(-50, -30, 50);
    scene.add(secondaryLight);
    secondaryLightRef.current = secondaryLight;

    const rimLight = new THREE.PointLight(0xec4899, 4, 300);
    rimLight.position.set(0, -60, -40);
    scene.add(rimLight);

    // Group for all core 3D models to allow responsive scroll-based tilt and parallax
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);
    coreGroupRef.current = coreGroup;

    // 5. Central 3D Quantum Space Core
    const coreGeo = new THREE.IcosahedronGeometry(18, 3);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: isLight ? 0xffffff : 0x071526,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.35,
      roughness: isLight ? 0.2 : 0.15,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);
    mainOrbRef.current = coreMesh;

    // Inner wireframe glow matrix
    const wireGeo = new THREE.IcosahedronGeometry(18.4, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284c7 : 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: isLight ? 0.4 : 0.25,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    coreMesh.add(wireMesh);
    wireMeshRef.current = wireMesh;

    // 6. Multi-Axis Interactive Gyroscope Rings (3D Quantum Orbiters)
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.85,
    });
    const torus1 = new THREE.Mesh(new THREE.TorusGeometry(32, 0.45, 16, 120), ringMat1);
    coreGroup.add(torus1);
    torusRef1.current = torus1;

    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.85,
    });
    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(42, 0.4, 16, 120), ringMat2);
    torus2.rotation.x = Math.PI / 3;
    coreGroup.add(torus2);
    torusRef2.current = torus2;

    const ringMat3 = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.85,
    });
    const torus3 = new THREE.Mesh(new THREE.TorusGeometry(52, 0.35, 16, 120), ringMat3);
    torus3.rotation.y = Math.PI / 4;
    coreGroup.add(torus3);
    torusRef3.current = torus3;

    // 7. Dynamic Particle Swarm (Interactive Starburst Field)
    const particleCount = 1800;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorCyan = new THREE.Color(0x06b6d4);
    const colorPurple = new THREE.Color(0xa855f7);
    const colorPink = new THREE.Color(0xf43f5e);

    for (let i = 0; i < particleCount; i++) {
      const radius = 30 + Math.random() * 220;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const mixedColor = Math.random() > 0.6 ? colorCyan : Math.random() > 0.3 ? colorPurple : colorPink;
      particleColors[i * 3] = mixedColor.r;
      particleColors[i * 3 + 1] = mixedColor.g;
      particleColors[i * 3 + 2] = mixedColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    // Custom circular soft glow texture for particles
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.7, 'rgba(6,182,212,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: isLight ? 0.6 : 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particleSystemRef.current = particles;

    // 8. Distant Deep Universe Star Matrix
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 1200;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
      starPositions[i * 3 + 2] = -200 + (Math.random() - 0.5) * 800;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      color: isLight ? 0x64748b : 0x94a3b8,
      transparent: true,
      opacity: isLight ? 0.4 : 0.5,
      blending: THREE.AdditiveBlending,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
    starFieldRef.current = starField;

    // 9. Interactive Mouse / Pointer Tracker (with smooth inertia damping)
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mousePosRef.current.targetX = normX * 28;
      mousePosRef.current.targetY = normY * 20;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const normX = (touch.clientX / window.innerWidth) * 2 - 1;
        const normY = -(touch.clientY / window.innerHeight) * 2 + 1;
        mousePosRef.current.targetX = normX * 28;
        mousePosRef.current.targetY = normY * 20;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 11. 60FPS Kinetic Animation Loop with AI Generation Pulse
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const generatingActive = isGeneratingRef.current;
      const effectiveMultiplier = (generatingActive ? 2.5 : 1) * speedMultiplier;

      // Smooth inertia lerp for scroll position & depth translation
      currentScrollRef.current += (scrollTargetRef.current - currentScrollRef.current) * 0.08;
      const scrollNorm = currentScrollRef.current;

      // Smooth inertia lerp for camera look
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * 0.04;
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * 0.04;

      if (cameraRef.current) {
        // Camera responds both to mouse movement, generation surge and dynamic scroll depth
        const genJitter = generatingActive ? Math.sin(elapsedTime * 8) * 0.6 : 0;
        cameraRef.current.position.x = mousePosRef.current.x + genJitter;
        cameraRef.current.position.y = mousePosRef.current.y - (scrollNorm * 0.025);
        cameraRef.current.position.z = 95 + Math.min(scrollNorm * 0.035, 40) - (generatingActive ? 6 : 0);
        cameraRef.current.lookAt(0, -(scrollNorm * 0.015), 0);
      }

      // Group level responsive tilt and rotation driven by user scroll & generation surge
      if (coreGroup) {
        coreGroup.rotation.x = (scrollNorm * 0.0018);
        coreGroup.rotation.y = (scrollNorm * 0.0012) + (generatingActive ? elapsedTime * 0.04 : 0);
        coreGroup.position.y = (scrollNorm * 0.02);
      }

      // Gyroscopic Rotations (faster and more vibrant when outputting)
      if (coreMesh) {
        coreMesh.rotation.y += 0.005 * effectiveMultiplier;
        coreMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.15;
        if (generatingActive) {
          const pulse = 1 + Math.sin(elapsedTime * 6) * 0.05;
          coreMesh.scale.set(pulse, pulse, pulse);
        } else {
          coreMesh.scale.set(1, 1, 1);
        }
      }

      if (torus1) {
        torus1.rotation.x += 0.008 * effectiveMultiplier;
        torus1.rotation.y += 0.004 * effectiveMultiplier;
      }
      if (torus2) {
        torus2.rotation.y += 0.007 * effectiveMultiplier;
        torus2.rotation.z += 0.005 * effectiveMultiplier;
      }
      if (torus3) {
        torus3.rotation.z += 0.006 * effectiveMultiplier;
        torus3.rotation.x += 0.009 * effectiveMultiplier;
      }

      // Swarm Particle Flow (responsive to scroll speed & generation)
      if (particles) {
        particles.rotation.y = elapsedTime * 0.025 * effectiveMultiplier + (scrollNorm * 0.0008);
        particles.rotation.x = Math.sin(elapsedTime * 0.1) * 0.08 + (scrollNorm * 0.0005);
      }

      if (starField) {
        starField.rotation.y = elapsedTime * 0.005 + (scrollNorm * 0.0002);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Palette switch effect
  const handlePaletteChange = (mode: 'cyber-space' | 'quantum-nebula' | 'event-horizon') => {
    setPaletteMode(mode);
    if (!mainOrbRef.current || !torusRef1.current || !torusRef2.current || !torusRef3.current) return;

    if (mode === 'cyber-space') {
      (mainOrbRef.current.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x06b6d4);
      (torusRef1.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x0891b2);
      (torusRef2.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x7c3aed);
      (torusRef3.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xe11d48);
    } else if (mode === 'quantum-nebula') {
      (mainOrbRef.current.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x8b5cf6);
      (torusRef1.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xa855f7);
      (torusRef2.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xec4899);
      (torusRef3.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x06b6d4);
    } else {
      // event-horizon
      (mainOrbRef.current.material as THREE.MeshPhysicalMaterial).emissive.setHex(0xf59e0b);
      (torusRef1.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xd97706);
      (torusRef2.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xef4444);
      (torusRef3.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x8b5cf6);
    }
  };

  // Warp speed pulse interaction
  const triggerWarpPulse = () => {
    setWarpActive(true);
    setSpeedMultiplier(4.5);
    setTimeout(() => {
      setSpeedMultiplier(1);
      setWarpActive(false);
    }, 1400);
  };

  const isLight = theme === 'light';

  return (
    <>
      {/* 3D WebGL Canvas Layer */}
      <div
        ref={mountRef}
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700 ${
          isLight ? 'opacity-85' : 'opacity-85'
        }`}
      />

      {/* Cybernetic Horizon Gradient Underlay */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none z-0 transition-colors duration-500 ${
          isLight
            ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.18),rgba(248,250,252,0.92))]'
            : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.12),rgba(255,255,255,0))]'
        }`}
      />

      {/* Interactive 3D HUD Floating Controller Badge */}
      {interactive && (
        <div
          className={`fixed bottom-4 left-4 md:left-72 z-30 flex items-center gap-1.5 p-1 rounded-xl backdrop-blur-md shadow-2xl text-xs transition-all ${
            isLight
              ? 'bg-white/85 border border-slate-300 text-slate-900 shadow-slate-300/40'
              : 'bg-neutral-950/80 border border-neutral-800/80 text-neutral-300'
          }`}
        >
          <button
            onClick={() => setShowControls(!showControls)}
            title="3D Spatial & Scroll Controls"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors font-medium select-none ${
              isLight
                ? 'hover:bg-slate-100 hover:text-slate-950 text-slate-800'
                : 'hover:bg-neutral-800/80 hover:text-white text-neutral-300'
            }`}
          >
            <Orbit className={`w-3.5 h-3.5 ${warpActive || isGenerating ? 'text-cyan-600 dark:text-cyan-400 animate-spin' : 'text-cyan-600 dark:text-cyan-400'}`} />
            <span className="hidden sm:inline font-mono text-[11px] font-semibold">
              {isGenerating ? 'Quantum Synced' : '3D Space Core'}
            </span>
          </button>

          {showControls && (
            <div
              className={`flex items-center gap-1 pl-1 pr-1 border-l ${
                isLight ? 'border-slate-300' : 'border-neutral-800'
              }`}
            >
              {/* Theme Buttons */}
              <button
                onClick={() => handlePaletteChange('cyber-space')}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  paletteMode === 'cyber-space'
                    ? isLight
                      ? 'bg-sky-100 text-sky-900 border border-sky-400 font-bold'
                      : 'bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-semibold'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Cyan
              </button>
              <button
                onClick={() => handlePaletteChange('quantum-nebula')}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  paletteMode === 'quantum-nebula'
                    ? isLight
                      ? 'bg-purple-100 text-purple-900 border border-purple-400 font-bold'
                      : 'bg-purple-950/90 text-purple-300 border border-purple-700/60 font-semibold'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Nebula
              </button>
              <button
                onClick={() => handlePaletteChange('event-horizon')}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  paletteMode === 'event-horizon'
                    ? isLight
                      ? 'bg-amber-100 text-amber-900 border border-amber-400 font-bold'
                      : 'bg-amber-950/90 text-amber-300 border border-amber-700/60 font-semibold'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Solar
              </button>

              {/* Warp Pulse Button */}
              <button
                onClick={triggerWarpPulse}
                disabled={warpActive}
                title="Trigger 3D Warp Pulse"
                className={`flex items-center gap-1 px-2 py-1 ml-1 rounded text-[10px] font-mono transition-all active:scale-95 ${
                  isLight
                    ? 'bg-sky-50 hover:bg-sky-100 border border-sky-400 text-sky-800 font-semibold'
                    : 'bg-neutral-900 hover:bg-cyan-950 border border-cyan-800/60 text-cyan-300'
                }`}
              >
                <Zap className={`w-3 h-3 ${warpActive ? 'animate-bounce text-cyan-600' : 'text-cyan-600 dark:text-cyan-400'}`} />
                <span>Warp</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
