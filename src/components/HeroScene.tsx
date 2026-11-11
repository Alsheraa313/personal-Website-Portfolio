import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const CAM_Z = 5;

// ── Helpers ────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useIsDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ── Procedural textures (no image files needed) ────────────────────────────

/** Soft horizontal bands plus streaky blotches, like a gas giant. */
function makeBandTexture(colors: string[], seed: number) {
  const W = 512;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rnd = mulberry32(seed);

  g.fillStyle = colors[0];
  g.fillRect(0, 0, W, H);
  g.filter = "blur(3px)";

  let y = -8;
  while (y < H + 8) {
    const h = 8 + rnd() * 26;
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.fillRect(-20, y, W + 40, h + 2);
    y += h;
  }

  for (let i = 0; i < 70; i++) {
    g.globalAlpha = 0.08 + rnd() * 0.14;
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.beginPath();
    g.ellipse(rnd() * W, rnd() * H, 12 + rnd() * 50, 2 + rnd() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Radial stripes with a gap, mapped across the ring's inner → outer radius. */
function makeRingTexture(color: string, seed: number) {
  const W = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = 4;
  const g = c.getContext("2d")!;
  const rnd = mulberry32(seed);
  g.fillStyle = color;

  for (let x = 0; x < W; x++) {
    const t = x / W;
    let a = 0.3 + 0.55 * Math.abs(Math.sin(t * 36 + rnd() * 0.4));
    if (t > 0.5 && t < 0.57) a *= 0.08; // the gap
    a *= Math.min(1, t * 10) * Math.min(1, (1 - t) * 10); // soft edges
    g.globalAlpha = Math.max(0, Math.min(1, a));
    g.fillRect(x, 0, 1, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── Stars ──────────────────────────────────────────────────────────────────

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPR;
  uniform float uScale;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vTw = 0.55 + 0.45 * sin(uTime * 1.4 + aPhase);
    gl_PointSize = aSize * uScale * uPR / (-mv.z);
  }
`;

const STAR_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vTw * uOpacity);
  }
`;

type Mouse = { current: { x: number; y: number } };

function Stars({
  dark,
  reduced,
  mouse,
  count = 900,
}: {
  dark: boolean;
  reduced: boolean;
  mouse: Mouse;
  count?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, phases } = useMemo(() => {
    const rnd = mulberry32(7);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * 46;
      positions[i * 3 + 1] = (rnd() - 0.5) * 28;
      positions[i * 3 + 2] = -4 - rnd() * 26;
      sizes[i] = 0.6 + Math.pow(rnd(), 3) * 2.4; // mostly small, a few bright
      phases[i] = rnd() * Math.PI * 2;
    }
    return { positions, sizes, phases };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPR: { value: 1 },
      uScale: { value: 45 },
      uOpacity: { value: 0.9 },
      uColor: { value: new THREE.Color("#E4F1EF") },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uColor.value.set(dark ? "#E4F1EF" : "#4D7C8A");
    uniforms.uOpacity.value = dark ? 0.9 : 0.65;
  }, [dark, uniforms]);

  useFrame((state, delta) => {
    uniforms.uPR.value = state.viewport.dpr;
    if (!reduced) uniforms.uTime.value = state.clock.elapsedTime;

    const g = group.current;
    if (!g) return;
    const tx = reduced ? 0 : -mouse.current.x * 0.25;
    const ty = reduced ? 0 : -mouse.current.y * 0.15;
    g.position.x = THREE.MathUtils.damp(g.position.x, tx, 2, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, ty, 2, delta);
    if (!reduced) g.rotation.z += delta * 0.004;
  });

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={STAR_VERT}
          fragmentShader={STAR_FRAG}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// ── Atmosphere glow (fresnel rim) ──────────────────────────────────────────

function Atmosphere({
  radius,
  color,
  strength = 0.9,
}: {
  radius: number;
  color: string;
  strength?: number;
}) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: strength },
    }),
    [color, strength],
  );

  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={/* glsl */ `
          varying vec3 vN;
          void main() {
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          varying vec3 vN;
          void main() {
            float f = pow(1.0 - abs(vN.z), 3.0);
            gl_FragColor = vec4(uColor, f * uStrength);
          }
        `}
      />
    </mesh>
  );
}

// ── Ringed planet + moon ───────────────────────────────────────────────────

function RingedPlanet({
  dark,
  reduced,
  mouse,
}: {
  dark: boolean;
  reduced: boolean;
  mouse: Mouse;
}) {
  const { viewport } = useThree();
  const outer = useRef<THREE.Group>(null);
  const planet = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Group>(null);

  const narrow = viewport.width < 4.5;
  const R = narrow ? viewport.width * 0.24 : Math.min(1.2, viewport.height * 0.29);
  const baseX = narrow ? viewport.width * 0.12 : viewport.width * 0.24;
  const baseY = narrow ? viewport.height * 0.22 : 0.1;

  const planetTex = useMemo(
    () => makeBandTexture(["#4D7C8A", "#7FC8B2", "#BFE8E2", "#3A6573", "#A7D8F2"], 11),
    [],
  );
  const ringTex = useMemo(
    () => makeRingTexture(dark ? "#BFE8E2" : "#4D7C8A", 5),
    [dark],
  );

  const ringGeo = useMemo(() => {
    const inner = R * 1.35;
    const outerR = R * 2.05;
    const geo = new THREE.RingGeometry(inner, outerR, 128);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outerR - inner), 0.5);
    }
    return geo;
  }, [R]);

  useEffect(() => () => planetTex.dispose(), [planetTex]);
  useEffect(() => () => ringTex.dispose(), [ringTex]);
  useEffect(() => () => ringGeo.dispose(), [ringGeo]);

  useFrame((_, delta) => {
    const g = outer.current;
    if (g) {
      const tx = reduced ? 0 : mouse.current.x * 0.45;
      const ty = reduced ? 0 : mouse.current.y * 0.3;
      g.position.x = THREE.MathUtils.damp(g.position.x, baseX + tx, 3, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, baseY + ty, 3, delta);
    }
    if (!reduced) {
      if (planet.current) planet.current.rotation.y += delta * 0.08;
      if (orbit.current) orbit.current.rotation.y += delta * 0.25;
    }
  });

  const moonOrbit = R * 2.7;

  return (
    <group ref={outer} position={[baseX, baseY, 0]}>
      <group rotation={[0.45, 0, -0.28]}>
        {/* Planet */}
        <mesh ref={planet}>
          <sphereGeometry args={[R, 64, 64]} />
          <meshStandardMaterial map={planetTex} roughness={0.85} metalness={0} />
        </mesh>
        <Atmosphere radius={R * 1.1} color={dark ? "#7FC8B2" : "#A7D8F2"} />

        {/* Rings */}
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={ringGeo}>
          <meshBasicMaterial
            map={ringTex}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Moon orbit path */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[moonOrbit - 0.004, moonOrbit + 0.004, 128]} />
          <meshBasicMaterial
            color={dark ? "#E4F1EF" : "#4D7C8A"}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Moon */}
        <group ref={orbit}>
          <mesh position={[moonOrbit, 0, 0]}>
            <sphereGeometry args={[R * 0.16, 32, 32]} />
            <meshStandardMaterial color="#BFDDF6" roughness={1} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ── Distant planet (desktop only) ──────────────────────────────────────────

function FarPlanet({ dark, reduced, mouse }: { dark: boolean; reduced: boolean; mouse: Mouse }) {
  const { viewport } = useThree();
  const ref = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const z = -3;
  const depth = (CAM_Z - z) / CAM_Z; // perspective factor at this depth
  const baseX = -(viewport.width / 2) * depth * 0.66;
  const baseY = -(viewport.height / 2) * depth * 0.58;

  const tex = useMemo(() => makeBandTexture(["#A7D8F2", "#BFDDF6", "#7FC8B2", "#DCF1EE"], 3), []);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, delta) => {
    const g = ref.current;
    if (g) {
      const tx = reduced ? 0 : -mouse.current.x * 0.2;
      const ty = reduced ? 0 : -mouse.current.y * 0.14;
      g.position.x = THREE.MathUtils.damp(g.position.x, baseX + tx, 3, delta);
      g.position.y = THREE.MathUtils.damp(g.position.y, baseY + ty, 3, delta);
    }
    if (!reduced && mesh.current) mesh.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={ref} position={[baseX, baseY, z]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      <Atmosphere radius={0.62} color={dark ? "#A7D8F2" : "#7FC8B2"} strength={0.8} />
    </group>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────

function Scene({ dark, reduced, mouse }: { dark: boolean; reduced: boolean; mouse: Mouse }) {
  const { viewport } = useThree();
  const narrow = viewport.width < 4.5;

  return (
    <>
      <ambientLight intensity={dark ? 0.25 : 0.7} />
      <directionalLight position={[-4, 3, 5]} intensity={2.6} />
      <Stars dark={dark} reduced={reduced} mouse={mouse} />
      <RingedPlanet dark={dark} reduced={reduced} mouse={mouse} />
      {!narrow && <FarPlanet dark={dark} reduced={reduced} mouse={mouse} />}
    </>
  );
}

// ── Exported component ─────────────────────────────────────────────────────

export default function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const dark = useIsDark();
  const reduced = useReducedMotion();

  const [supported] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  // Track the cursor across the whole window
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Stop rendering when the hero is scrolled out of view
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!supported) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-1000 ${
        ready ? (dark ? "opacity-100" : "opacity-90") : "opacity-0"
      }`}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, CAM_Z], fov: 45 }}
        frameloop={visible ? "always" : "never"}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={() => setReady(true)}
      >
        <Scene dark={dark} reduced={reduced} mouse={mouse} />
      </Canvas>
    </div>
  );
}